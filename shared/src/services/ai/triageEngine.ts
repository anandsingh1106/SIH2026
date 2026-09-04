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
 * The vitals form captures temperature in Fahrenheit (its input is labelled
 * °F), and the API works in Celsius.
 *
 * This used to convert only above 45, guessing at the unit. That silently
 * mangled the clinically important range: a real 93.6 °F reading was passed
 * through as 93.6 and a hypothermic 34.2 °C was read as already-Celsius, so
 * normal patients were reported with alarming temperatures. The form states
 * its unit, so convert unconditionally instead of guessing.
 */
export function toCelsius(temperature?: number): number | undefined {
  if (temperature == null) return undefined;
  return Number(((temperature - 32) * 5 / 9).toFixed(1));
}

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
          ...(toCelsius(vitals.temperature) != null
            ? { temperature: toCelsius(vitals.temperature) }
            : {}),
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
    // How many independent red flags agree, which is a corroboration count --
    // not a validated match against any published guideline.
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
