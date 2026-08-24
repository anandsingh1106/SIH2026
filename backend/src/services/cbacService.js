/**
 * CBAC (Community Based Assessment Checklist) scoring — the screening tool used
 * by India's NPCDCS programme for NCD risk stratification.
 *
 * Scoring follows the published CBAC form: points for age band, waist
 * circumference, physical activity, family history, and tobacco/alcohol use.
 * A total of 4 or more flags the person for further evaluation.
 *
 * This is a deterministic screening score, not a diagnosis. Suspected-condition
 * flags below use standard screening thresholds and always recommend
 * professional confirmation rather than asserting a diagnosis.
 */

function agePoints(age) {
  if (age == null) return 0;
  if (age >= 60) return 4;
  if (age >= 50) return 3;
  if (age >= 40) return 2;
  if (age >= 30) return 1;
  return 0;
}

function waistPoints(waistCm, gender) {
  if (waistCm == null) return 0;
  const female = String(gender).toUpperCase() === 'FEMALE';
  // Asian-Indian cut-offs differ by sex.
  if (female) {
    if (waistCm > 90) return 2;
    if (waistCm >= 80) return 1;
    return 0;
  }
  if (waistCm > 100) return 2;
  if (waistCm >= 90) return 1;
  return 0;
}

export const CBAC_THRESHOLD = 4;

export function calculateCbac(input) {
  const {
    age, gender, waistCircumference,
    physicalActivityAdequate = true,
    familyHistory = false,
    tobaccoUse = false,
    alcoholUse = false,
    bloodPressureSystolic, bloodPressureDiastolic, bloodGlucose,
  } = input;

  const breakdown = {
    age: agePoints(age),
    waist: waistPoints(waistCircumference, gender),
    physicalActivity: physicalActivityAdequate ? 0 : 1,
    familyHistory: familyHistory ? 2 : 0,
    tobacco: tobaccoUse ? 1 : 0,
    alcohol: alcoholUse ? 1 : 0,
  };

  const score = Object.values(breakdown).reduce((sum, n) => sum + n, 0);

  // Screening thresholds (not diagnostic criteria).
  const suspectedHypertension =
    (bloodPressureSystolic != null && bloodPressureSystolic >= 140) ||
    (bloodPressureDiastolic != null && bloodPressureDiastolic >= 90);

  const suspectedDiabetes = bloodGlucose != null && bloodGlucose >= 140;

  let riskCategory = 'LOW';
  if (score >= CBAC_THRESHOLD || suspectedHypertension || suspectedDiabetes) riskCategory = 'MODERATE';
  if ((score >= CBAC_THRESHOLD && (suspectedHypertension || suspectedDiabetes)) ||
      (bloodPressureSystolic != null && bloodPressureSystolic >= 160) ||
      (bloodGlucose != null && bloodGlucose >= 200)) {
    riskCategory = 'HIGH';
  }

  const recommendations = [];
  if (score >= CBAC_THRESHOLD) {
    recommendations.push('CBAC score is at or above the referral threshold — refer for NCD evaluation at the PHC.');
  }
  if (suspectedHypertension) {
    recommendations.push('Elevated blood pressure recorded. Repeat measurement and refer for clinical confirmation.');
  }
  if (suspectedDiabetes) {
    recommendations.push('Raised blood glucose recorded. Refer for confirmatory fasting glucose or HbA1c testing.');
  }
  if (tobaccoUse) recommendations.push('Offer tobacco cessation counselling.');
  if (alcoholUse) recommendations.push('Offer counselling on alcohol reduction.');
  if (!physicalActivityAdequate) recommendations.push('Advise at least 30 minutes of physical activity daily.');
  if (recommendations.length === 0) {
    recommendations.push('No immediate risk factors identified. Repeat screening as per programme schedule.');
  }

  return {
    score,
    breakdown,
    riskCategory,
    suspectedHypertension,
    suspectedDiabetes,
    referralRecommended: score >= CBAC_THRESHOLD || riskCategory === 'HIGH',
    recommendations,
    disclaimer: 'CBAC is a screening tool. It does not diagnose disease; clinical confirmation is required.',
  };
}
