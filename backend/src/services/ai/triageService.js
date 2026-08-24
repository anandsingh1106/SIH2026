import { getAIProvider } from './provider.js';
import { lookup, topics } from './knowledgeBase.js';
import { logger } from '../../utils/logger.js';

/**
 * Triage combines deterministic red-flag rules with an optional AI explanation.
 *
 * The rules decide the risk category — AI never overrides them (§32). If the AI
 * provider is unavailable the deterministic result still stands on its own.
 */

// Symptoms that mandate immediate escalation regardless of anything else.
const EMERGENCY_PATTERNS = [
  { match: /chest pain|crushing chest|chest tightness/i, reason: 'Possible cardiac event' },
  { match: /difficulty breathing|breathless|short of breath|gasping/i, reason: 'Respiratory distress' },
  { match: /unconscious|unresponsive|fainting|collapse/i, reason: 'Altered consciousness' },
  { match: /severe bleeding|heavy bleeding|haemorrhage|hemorrhage/i, reason: 'Severe bleeding' },
  { match: /convulsion|seizure|fits/i, reason: 'Seizure activity' },
  { match: /stroke|face drooping|slurred speech|one[- ]sided weakness/i, reason: 'Possible stroke' },
  { match: /blue lips|cyanosis/i, reason: 'Hypoxia' },
  { match: /severe abdominal pain|rigid abdomen/i, reason: 'Acute abdomen' },
  { match: /poisoning|overdose|snake ?bite/i, reason: 'Toxic exposure' },
];

const URGENT_PATTERNS = [
  { match: /high fever|fever above 39|persistent fever/i, reason: 'High or persistent fever' },
  { match: /dehydrat|unable to drink|not passing urine/i, reason: 'Dehydration risk' },
  { match: /vomiting blood|blood in stool|blood in urine/i, reason: 'Blood loss' },
  { match: /severe headache|worst headache/i, reason: 'Severe headache' },
  { match: /pregnan.*(bleed|pain)|reduced fetal movement/i, reason: 'Obstetric concern' },
];

function vitalRedFlags(vitals = {}) {
  const flags = [];
  const { bloodPressureSystolic: sys, oxygenSaturation: spo2,
          heartRate: hr, temperature: temp, respiratoryRate: rr } = vitals;

  if (spo2 != null && spo2 < 90) flags.push({ severity: 'EMERGENCY', reason: `Oxygen saturation ${spo2}% is critically low` });
  else if (spo2 != null && spo2 < 94) flags.push({ severity: 'URGENT', reason: `Oxygen saturation ${spo2}% is below normal` });

  if (sys != null && sys >= 180) flags.push({ severity: 'EMERGENCY', reason: `Systolic BP ${sys} indicates hypertensive crisis` });
  else if (sys != null && sys < 90) flags.push({ severity: 'EMERGENCY', reason: `Systolic BP ${sys} indicates possible shock` });
  else if (sys != null && sys >= 160) flags.push({ severity: 'URGENT', reason: `Systolic BP ${sys} is markedly raised` });

  if (hr != null && (hr > 130 || hr < 45)) flags.push({ severity: 'URGENT', reason: `Heart rate ${hr} is outside the safe range` });
  if (temp != null && temp >= 39.5) flags.push({ severity: 'URGENT', reason: `Temperature ${temp}°C is very high` });
  if (rr != null && rr > 30) flags.push({ severity: 'URGENT', reason: `Respiratory rate ${rr} is elevated` });

  return flags;
}

const SYSTEM_PROMPT = `You are a clinical decision-support assistant for community health workers in rural Maharashtra, India.

Strict rules:
- You do NOT diagnose. You never state a definitive diagnosis.
- You never prescribe or recommend specific medicines or doses.
- You summarise findings and explain the reasoning behind an already-computed risk level.
- You always defer to a qualified clinician for confirmation.
- If information is missing, say so rather than assuming.
- Reply in plain language suitable for a health worker, in under 120 words.`;

export async function assessTriage({ symptoms = [], vitals = {}, age, notes }) {
  const text = [...symptoms, notes || ''].join(' ');

  const matched = [];
  let category = 'ROUTINE';

  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.match.test(text)) {
      matched.push({ severity: 'EMERGENCY', reason: pattern.reason });
      category = 'EMERGENCY';
    }
  }
  for (const pattern of URGENT_PATTERNS) {
    if (pattern.match.test(text)) {
      matched.push({ severity: 'URGENT', reason: pattern.reason });
      if (category !== 'EMERGENCY') category = 'URGENT';
    }
  }

  const flags = vitalRedFlags(vitals);
  for (const flag of flags) {
    matched.push(flag);
    if (flag.severity === 'EMERGENCY') category = 'EMERGENCY';
    else if (flag.severity === 'URGENT' && category !== 'EMERGENCY') category = 'URGENT';
  }

  // Age extremes raise the floor but never lower an existing escalation.
  if (age != null && (age < 5 || age > 70) && category === 'ROUTINE' && matched.length > 0) {
    category = 'URGENT';
    matched.push({ severity: 'URGENT', reason: `Age ${age} increases risk` });
  }

  const score = category === 'EMERGENCY' ? 90 + Math.min(matched.length * 2, 10)
    : category === 'URGENT' ? 55 + Math.min(matched.length * 5, 30)
    : matched.length > 0 ? 30 : 10;

  const recommendedAction =
    category === 'EMERGENCY'
      ? 'Arrange immediate emergency transfer and call 108. Do not delay for further assessment.'
      : category === 'URGENT'
      ? 'Refer for same-day clinical evaluation at the nearest PHC or CHC.'
      : 'Routine follow-up is appropriate. Advise the patient to return if symptoms worsen.';

  const result = {
    riskScore: score,
    riskCategory: category,
    detectedFindings: matched,
    recommendedAction,
    explanation: null,
    aiAssisted: false,
    disclaimer:
      'This is an automated triage aid, not a diagnosis. A qualified clinician must confirm all findings. ' +
      'It does not recommend or prescribe any medication.',
  };

  // The AI layer only explains the rule-based outcome.
  const provider = getAIProvider();
  if (provider.isConfigured()) {
    try {
      const prompt = [
        `Risk level already determined by clinical rules: ${category}.`,
        `Reported symptoms: ${symptoms.join(', ') || 'none recorded'}.`,
        `Vital signs: ${JSON.stringify(vitals)}.`,
        age != null ? `Age: ${age}.` : '',
        matched.length ? `Rule findings: ${matched.map((m) => m.reason).join('; ')}.` : '',
        'Explain in plain language why this risk level is appropriate and what the health worker should watch for. Do not diagnose or suggest medicines.',
      ].filter(Boolean).join('\n');

      const explanation = await provider.complete({ system: SYSTEM_PROMPT, prompt, maxTokens: 300 });
      if (explanation) {
        result.explanation = explanation.trim();
        result.aiAssisted = true;
      }
    } catch (err) {
      // The deterministic result remains valid without the AI narrative.
      logger.warn('AI triage explanation unavailable', { message: err.message });
    }
  }

  return result;
}

/**
 * Answers a question, preferring the AI provider and falling back to the
 * offline knowledge base when none is configured (or the provider fails).
 *
 * The fallback only answers what it actually knows — an unmatched question
 * returns the list of covered topics rather than an invented answer.
 */
export async function assistantReply({ question, context }) {
  const provider = getAIProvider();

  if (provider.isConfigured()) {
    try {
      const answer = await provider.complete({
        system: SYSTEM_PROMPT,
        prompt: context ? `Context: ${context}\n\nQuestion: ${question}` : question,
        maxTokens: 500,
      });

      if (answer?.trim()) {
        return {
          answer: answer.trim(),
          available: true,
          source: 'ai',
          disclaimer: 'AI-generated guidance. Not a diagnosis. Confirm with a qualified clinician.',
        };
      }
    } catch (err) {
      // Fall through to the offline answer rather than failing the request.
      logger.warn('AI provider unavailable, using knowledge base', { message: err.message });
    }
  }

  const entry = lookup(question);

  if (entry) {
    return {
      answer: `**${entry.title}**\n\n${entry.answer}`,
      available: true,
      source: 'knowledge-base',
      reference: entry.source,
      disclaimer:
        'Answered from built-in programme guidance, not a live AI model. Not a diagnosis — confirm with a qualified clinician.',
    };
  }

  return {
    answer:
      `I don't have information on that yet.\n\nI can currently help with:\n\n` +
      topics().map((t) => `• ${t}`).join('\n') +
      `\n\nFor anything clinical, please consult a qualified clinician.`,
    available: true,
    source: 'knowledge-base',
    disclaimer: 'Answered from built-in programme guidance, not a live AI model.',
  };
}
