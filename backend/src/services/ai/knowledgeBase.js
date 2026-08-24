/**
 * Offline healthcare knowledge base.
 *
 * Used when no AI provider is configured, so the assistant still answers common
 * questions instead of returning nothing. Every entry is drawn from published
 * Government of India / NHM programme guidance — nothing here is invented, and
 * no entry diagnoses or prescribes.
 *
 * When an AI key is present the provider answers instead; this stays as the
 * fallback.
 */

const ENTRIES = [
  {
    id: 'pregnancy-danger-signs',
    keywords: ['pregnan', 'danger sign', 'anc', 'antenatal', 'garbh', 'maternal', 'labour', 'delivery'],
    title: 'Danger signs during pregnancy',
    answer: `Refer the woman to a facility immediately if any of these appear:

• Vaginal bleeding
• Severe headache with blurred vision
• Convulsions or fits
• High fever
• Severe abdominal pain
• Reduced or absent fetal movement
• Swelling of face and hands
• Difficulty breathing

Under JSSK, transport, delivery, drugs and diagnostics are free in public facilities. PMSMA provides assured antenatal check-ups on the 9th of every month.`,
    source: 'NHM — JSSK / PMSMA guidance',
  },
  {
    id: 'immunization-schedule',
    keywords: ['vaccin', 'immuni', 'bcg', 'opv', 'pentavalent', 'measles', 'tika', 'schedule'],
    title: 'Universal Immunisation Programme schedule',
    answer: `Routine childhood schedule:

• At birth — BCG, OPV-0, Hepatitis B birth dose
• 6 weeks — OPV-1, Pentavalent-1, Rotavirus-1, fIPV-1, PCV-1
• 10 weeks — OPV-2, Pentavalent-2, Rotavirus-2
• 14 weeks — OPV-3, Pentavalent-3, Rotavirus-3, fIPV-2, PCV-2
• 9–12 months — MR-1, JE-1, PCV booster, Vitamin A
• 16–24 months — MR-2, OPV booster, DPT booster, JE-2

Record every dose against the child so overdue vaccinations surface in the dashboard.`,
    source: 'Universal Immunisation Programme',
  },
  {
    id: 'ncd-cbac',
    keywords: ['cbac', 'ncd', 'diabet', 'hypertens', 'blood pressure', 'sugar', 'screening', 'risk score'],
    title: 'CBAC screening and NCD risk',
    answer: `CBAC scores risk from age, waist circumference, physical activity, family history, and tobacco/alcohol use. A total of 4 or more means refer for further evaluation.

Screening thresholds used in this application:
• Blood pressure ≥ 140/90 → possible hypertension, needs confirmation
• Random blood glucose ≥ 140 mg/dL → possible diabetes, needs confirmation

These are screening indicators only. Diagnosis requires clinical confirmation at a PHC or CHC.`,
    source: 'NPCDCS — Community Based Assessment Checklist',
  },
  {
    id: 'emergency-numbers',
    keywords: ['emergency', 'ambulance', '108', '102', 'helpline', 'urgent', 'call'],
    title: 'Emergency helplines',
    answer: `• 108 — Ambulance / medical emergency
• 112 — National emergency number
• 104 — Health advice and maternal helpline
• 1075 — Public health helpline

Call 108 immediately for chest pain, difficulty breathing, severe bleeding, seizures, or loss of consciousness. Keep the patient calm and give nothing by mouth to an unconscious person.`,
    source: 'National Health Mission',
  },
  {
    id: 'referral-process',
    keywords: ['referral', 'refer', 'transfer', 'higher centre', 'chc', 'district hospital'],
    title: 'Making a referral',
    answer: `A referral moves through: created → sent → accepted → in transit → arrived → in consultation → completed.

Include the clinical summary, provisional diagnosis and urgency. Mark EMERGENCY only for cases needing immediate intervention — those surface at the top of the destination facility's queue.

The receiving facility accepts or rejects; the originating clinician is notified at every step.`,
    source: 'Application referral workflow',
  },
  {
    id: 'home-visit',
    keywords: ['home visit', 'household', 'field visit', 'asha visit', 'village'],
    title: 'Recording a home visit',
    answer: `Capture observations, symptoms, any danger signs, and a risk level for every visit.

Marking a visit CRITICAL, or ticking "referral recommended", raises an alert to clinicians at the linked facility rather than leaving the finding in a field record.

Visits recorded offline are queued and synced when connectivity returns; re-syncing the same visit never creates a duplicate.`,
    source: 'Application field workflow',
  },
  {
    id: 'offline-sync',
    keywords: ['offline', 'sync', 'no network', 'connectivity', 'queue'],
    title: 'Working offline',
    answer: `Records created without connectivity are stored on the device and queued.

When the connection returns, the queue is sent to the server in a batch. Each operation carries a unique id, so retrying after a dropped connection cannot create duplicate records.

The status bar shows how many operations are still pending.`,
    source: 'Application offline design',
  },
  {
    id: 'medicine-stock',
    keywords: ['stock', 'inventory', 'medicine', 'drug', 'supply', 'reorder', 'expiry'],
    title: 'Medicine stock and inventory',
    answer: `Stock levels are tracked per facility and batch, with expiry dates.

Crossing the reorder level raises a low-stock alert to administrators. Stock can never go negative — an issue larger than the balance is rejected rather than allowed through.

Transfers between facilities move stock atomically: it leaves one facility and arrives at the other as a single operation.`,
    source: 'Application inventory workflow',
  },
];

/** Words too common to be useful for matching. */
const STOPWORDS = new Set([
  'what', 'when', 'where', 'which', 'how', 'why', 'the', 'and', 'for', 'are',
  'is', 'to', 'of', 'in', 'do', 'does', 'can', 'i', 'a', 'an', 'my', 'me',
  'should', 'tell', 'about', 'please', 'need',
]);

/**
 * Matches a keyword at a word boundary, allowing a suffix so stems like
 * "pregnan" still match "pregnancy".
 *
 * A plain substring test is not enough: "anc" would match inside "France".
 */
function matchesKeyword(question, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}`, 'i').test(question);
}

function scoreEntry(entry, question) {
  const q = question.toLowerCase();

  // A keyword hit is the only thing that qualifies an entry. Word overlap
  // alone must never select a topic, or unrelated questions match whichever
  // entry happens to share a common word.
  const keywordHits = entry.keywords.filter((k) => matchesKeyword(q, k)).length;
  if (keywordHits === 0) return 0;

  let score = keywordHits * 10;

  // Overlap only refines the ranking between entries that already matched.
  const words = q.split(/\W+/).filter((w) => w.length > 3 && !STOPWORDS.has(w));
  for (const word of words) {
    if (entry.title.toLowerCase().includes(word)) score += 3;
    if (entry.answer.toLowerCase().includes(word)) score += 1;
  }

  return score;
}

/**
 * Returns the best matching entry, or null when nothing is relevant enough.
 * Never guesses: an unmatched question yields null so the caller can say it
 * does not know rather than answering with an unrelated topic.
 */
export function lookup(question) {
  if (!question?.trim()) return null;

  const ranked = ENTRIES
    .map((entry) => ({ entry, score: scoreEntry(entry, question) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked.length ? ranked[0].entry : null;
}

export function topics() {
  return ENTRIES.map((e) => e.title);
}
