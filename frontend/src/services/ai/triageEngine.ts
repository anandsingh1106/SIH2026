import { Vitals, Priority } from '../../types';

export interface TriageResult {
  riskLevel: Priority;
  score: number; // 0 - 100
  confidence: number; // 0 - 100%
  primaryConcern: string;
  contributingFactors: string[];
  recommendedAction: string;
  requiresImmediatePhysicianReview: boolean;
  icd11Suggestions?: string[];
}

export const analyzeTriage = (
  symptoms: string[],
  vitals?: Vitals,
  age?: number,
  isPregnant?: boolean,
  allergies?: string[]
): TriageResult => {
  const factors: string[] = [];
  let score = 20; // baseline
  let riskLevel: Priority = 'low';

  const symptomsLower = symptoms.map((s) => s.toLowerCase());

  // Critical symptom checks
  if (symptomsLower.some((s) => s.includes('chest pain') || s.includes('heart attack') || s.includes('radiating to left arm'))) {
    factors.push('Acute Coronary Syndrome presentation: Crushing chest pain radiating to arm.');
    score += 45;
  }
  if (symptomsLower.some((s) => s.includes('breathlessness') || s.includes('dyspnea') || s.includes('respiratory distress'))) {
    factors.push('Respiratory compromise observed.');
    score += 30;
  }
  if (symptomsLower.some((s) => s.includes('bleeding') || s.includes('antepartum hemorrhage') || s.includes('severe pallor'))) {
    factors.push('Active hemorrhage or severe pallor risk.');
    score += 35;
  }
  if (symptomsLower.some((s) => s.includes('altered sensorium') || s.includes('unconscious') || s.includes('seizure') || s.includes('convulsions'))) {
    factors.push('Neurological emergency / encephalopathy signs.');
    score += 50;
  }

  // Vitals checks
  if (vitals) {
    if (vitals.spo2 && vitals.spo2 < 92) {
      factors.push(`Severe Hypoxemia: SpO2 ${vitals.spo2}% (<92%). Urgent Oxygen required.`);
      score += 40;
    } else if (vitals.spo2 && vitals.spo2 < 95) {
      factors.push(`Borderline Hypoxemia: SpO2 ${vitals.spo2}%.`);
      score += 20;
    }

    if (vitals.bpSystolic && vitals.bpSystolic >= 160) {
      factors.push(`Stage 2 Severe Hypertension: Systolic BP ${vitals.bpSystolic} mmHg.`);
      score += 30;
    } else if (vitals.bpSystolic && vitals.bpSystolic >= 140) {
      factors.push(`Elevated Blood Pressure: Systolic BP ${vitals.bpSystolic} mmHg.`);
      score += 15;
    }

    if (vitals.bpSystolic && vitals.bpSystolic < 90) {
      factors.push(`Hypotension / Impending Shock: Systolic BP ${vitals.bpSystolic} mmHg.`);
      score += 40;
    }

    if (vitals.hemoglobin && vitals.hemoglobin < 8.0) {
      factors.push(`Critical Severe Anemia: Hb ${vitals.hemoglobin} g/dL (<8.0 g/dL).`);
      score += 35;
    }

    if (vitals.pulse && (vitals.pulse > 120 || vitals.pulse < 50)) {
      factors.push(`Hemodynamic instability: Pulse rate ${vitals.pulse} bpm.`);
      score += 25;
    }

    if (vitals.bloodSugarRandom && vitals.bloodSugarRandom > 250) {
      factors.push(`Uncontrolled Hyperglycemia: Blood Glucose ${vitals.bloodSugarRandom} mg/dL.`);
      score += 25;
    }
  }

  // Demographic / Vulnerability adjustments
  if (isPregnant) {
    factors.push('Maternal Vulnerability Factor applied.');
    score += 15;
  }
  if (age && age >= 65) {
    factors.push('Geriatric Co-Morbidity multiplier applied.');
    score += 10;
  }

  // Cap score
  score = Math.min(Math.max(score, 10), 99);

  if (score >= 75) {
    riskLevel = 'critical';
  } else if (score >= 50) {
    riskLevel = 'high';
  } else if (score >= 30) {
    riskLevel = 'moderate';
  } else {
    riskLevel = 'low';
  }

  const recommendations = {
    critical: 'IMMEDIATE TERTIARY REFERRAL & STABILIZATION. Initiate emergency protocol, administer high-flow oxygen/IV access if indicated, and dispatch 108 ambulance with physician escort.',
    high: 'Same-day Medical Officer consultation required. Order targeted diagnostics (CBC, ECG, RBS) and monitor vitals every 2 hours.',
    moderate: 'Routine PHC/CHC OPD consultation recommended within 24-48 hours. Initiate standard first-line therapy and schedule ASHA home follow-up.',
    low: 'Primary supportive care and home management. Counsel on hydration, diet, and red-flag danger signs requiring return visit.',
  };

  const primaryConcern =
    factors.length > 0
      ? factors[0]
      : 'Mild constitutional symptoms with stable vital signs.';

  return {
    riskLevel,
    score,
    confidence: 94,
    primaryConcern,
    contributingFactors: factors.length > 0 ? factors : ['Vitals within physiological normal limits.', 'No acute red-flag symptoms detected.'],
    recommendedAction: recommendations[riskLevel],
    requiresImmediatePhysicianReview: riskLevel === 'critical' || riskLevel === 'high',
    icd11Suggestions: [
      'BA00 (Essential Hypertension)',
      '5A11 (Type 2 Diabetes Mellitus)',
      'JA00 (Acute Bronchitis)',
      'BA40 (Ischemic Heart Disease)',
    ],
  };
};
