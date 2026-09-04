import { PrescribedMedicine, Patient } from '../../types';

export interface AllergyWarning {
  medicineName: string;
  matchedAllergy: string;
  severity: 'high' | 'critical';
  message: string;
}

export const checkPrescriptionSafety = (
  medicines: PrescribedMedicine[],
  patient?: Patient
): AllergyWarning[] => {
  const warnings: AllergyWarning[] = [];
  if (!patient || !patient.allergies || patient.allergies.length === 0) return warnings;

  const allergyList = patient.allergies.map((a) => a.toLowerCase());

  for (const med of medicines) {
    const medNameLower = med.name.toLowerCase();
    const genericLower = med.genericName.toLowerCase();

    // Penicillin cross-reactivity
    if (allergyList.some((a) => a.includes('penicillin'))) {
      if (
        medNameLower.includes('amoxicillin') ||
        genericLower.includes('amoxicillin') ||
        medNameLower.includes('ampicillin') ||
        genericLower.includes('penicillin')
      ) {
        warnings.push({
          medicineName: med.name,
          matchedAllergy: 'Penicillin',
          severity: 'critical',
          message: `CRITICAL ALLERGY ALERT: Patient has a recorded Penicillin allergy. ${med.name} is a beta-lactam antibiotic and carries high anaphylaxis risk. Substitute with Azithromycin or Doxycycline.`,
        });
      }
    }

    // Sulfa cross-reactivity
    if (allergyList.some((a) => a.includes('sulfa'))) {
      if (medNameLower.includes('cotrimoxazole') || genericLower.includes('sulfamethoxazole')) {
        warnings.push({
          medicineName: med.name,
          matchedAllergy: 'Sulfa Drugs',
          severity: 'high',
          message: `ALLERGY ALERT: Patient has documented Sulfa allergy. Avoid Cotrimoxazole / Trimethoprim-Sulfamethoxazole.`,
        });
      }
    }

    // NSAID / Aspirin
    if (allergyList.some((a) => a.includes('aspirin') || a.includes('nsaid'))) {
      if (medNameLower.includes('ibuprofen') || medNameLower.includes('diclofenac') || medNameLower.includes('aspirin')) {
        warnings.push({
          medicineName: med.name,
          matchedAllergy: 'Aspirin / NSAIDs',
          severity: 'high',
          message: `ALLERGY ALERT: Patient has recorded NSAID allergy. Use Paracetamol for analgesia instead.`,
        });
      }
    }
  }

  return warnings;
};
