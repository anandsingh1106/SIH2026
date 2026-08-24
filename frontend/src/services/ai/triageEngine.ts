import { Vitals, Priority } from '../../types';
import { backendApi } from '../api/backendApi';

export interface TriageResult {
  riskLevel: Priority;
  score: number; // 0 - 100
  confidence: number; // 0 - 100%
  primaryConcern: string;
  contributingFactors: string[];
  recommendedAction: string;
  requiresImmediatePhysicianReview: boolean;
  explanation?: string | null;
  aiAssisted?: boolean;
  disclaimer?: string;
}

const RISK_LEVEL: Record<string, Priority> = {
  EMERGENCY: 'critical',
  URGENT: 'high',
  ROUTINE: 'low',
};

/**
 * Triage is computed on the server so the clinical rules live in one place and
 * the AI provider key never reaches the browser.
 */
export const analyzeTriage = async (
  symptoms: string[],
  vitals?: Vitals,
  age?: number
): Promise<TriageResult> => {
  const result = await backendApi.triage({
    symptoms,
    age,
    vitals: vitals
      ? {
          ...(vitals.temperature != null ? { temperature: vitals.temperature } : {}),
          ...(vitals.bpSystolic != null ? { bloodPressureSystolic: vitals.bpSystolic } : {}),
          ...(vitals.bpDiastolic != null ? { bloodPressureDiastolic: vitals.bpDiastolic } : {}),
          ...(vitals.pulse != null ? { heartRate: vitals.pulse } : {}),
          ...(vitals.spo2 != null ? { oxygenSaturation: vitals.spo2 } : {}),
        }
      : undefined,
  });

  const factors = result.detectedFindings.map((f) => f.reason);

  return {
    riskLevel: RISK_LEVEL[result.riskCategory] ?? 'low',
    score: result.riskScore,
    // Confidence reflects how many independent findings agree.
    confidence: Math.min(60 + result.detectedFindings.length * 10, 95),
    primaryConcern: factors[0] || 'No red-flag findings detected',
    contributingFactors: factors,
    recommendedAction: result.recommendedAction,
    requiresImmediatePhysicianReview: result.riskCategory === 'EMERGENCY',
    explanation: result.explanation,
    aiAssisted: result.aiAssisted,
    disclaimer: result.disclaimer,
  };
};
