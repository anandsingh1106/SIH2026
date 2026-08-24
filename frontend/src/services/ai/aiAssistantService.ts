import { UserRole } from '../../types';

export interface AIMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
  suggestedActions?: { label: string; action: string }[];
}

export const getAIContextualResponse = async (
  query: string,
  role: UserRole = 'asha',
  patientContext?: { name: string; age: number; vitals?: string; diagnosis?: string }
): Promise<AIMessage> => {
  // Simulate intelligent asynchronous response processing
  await new Promise((r) => setTimeout(r, 450));

  const q = query.toLowerCase();

  // ASHA queries
  if (role === 'asha' || q.includes('home visit') || q.includes('anc') || q.includes('vaccin')) {
    if (q.includes('visit') || q.includes('pending') || q.includes('today')) {
      return {
        sender: 'assistant',
        text: `Namaskar! You currently have 4 priority tasks today in Paud Village:
1. 🚨 **Emergency**: Follow-up on Kavita Gaikwad (28 Wks, Severe Anemia transferred to Sassoon).
2. 💉 **Immunization**: Aarav Gaikwad (MR-1 & Vitamin A due at Anganwadi).
3. 🩺 **NCD Follow-up**: Ramesh Patil (Blood Pressure & Random Blood Sugar check).
4. 📋 **CBAC Screening**: Vandana Jadhav (30+ Population NCD Survey).

Would you like me to open the Village Household Map with GPS navigation tags?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          { label: 'Open Village Map', action: 'navigate:/asha/map' },
          { label: 'View Tasks', action: 'navigate:/asha/tasks' },
        ],
      };
    }

    if (q.includes('hb') || q.includes('anemia') || q.includes('pregnant') || q.includes('danger')) {
      return {
        sender: 'assistant',
        text: `⚠️ **Maternal Red-Flag Protocols (Maharashtra NHM Guidelines)**:
- **Severe Anemia (Hb < 8.0 g/dL)**: Immediate tele-referral to CHC/District Hospital for parenteral iron or blood cross-match.
- **Pre-Eclampsia Signs**: Severe headache, blurring of vision, epigastric pain, systolic BP ≥ 140 mmHg.
- **Action**: Do not delay. Request 108 ambulance dispatch and alert PHC Medical Officer Dr. Deshmukh.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ['NHM Maharashtra Maternal Care Guidelines 2026', 'JSSK Protocol'],
      };
    }
  }

  // Doctor queries
  if (role === 'doctor' || q.includes('summarize') || q.includes('treatment') || q.includes('ecg')) {
    if (patientContext) {
      return {
        sender: 'assistant',
        text: `📋 **Clinical Summary for ${patientContext.name} (${patientContext.age}y)**:
- **Known Conditions**: Hypertension (Amlodipine 5mg), T2DM (Metformin 500mg SR).
- **Recent Vitals**: BP 146/94 mmHg, Pulse 82 bpm, Blood Sugar 188 mg/dL.
- **Lab Highlights**: HbA1c 7.4% (suboptimal), Serum Creatinine 1.0 mg/dL (normal).
- **⚠️ Allergen Alert**: Documented **Penicillin** and **Sulfa** allergies. Avoid beta-lactams and co-trimoxazole.
- **Differential Considerations**: Inadequate BP control on monotherapy. Consider titration or dual ACEi/ARB combo after renal panel verification.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ['PHC Longitudinal EHR Database', 'ICD-11 BA00'],
      };
    }

    if (q.includes('guideline') || q.includes('protocol') || q.includes('htn')) {
      return {
        sender: 'assistant',
        text: `🩺 **Maharashtra Clinical Guideline: Hypertension at PHC**:
1. Stage 1 (140-159 / 90-99): Lifestyle modification + Amlodipine 5mg OD.
2. Stage 2 (≥160 / ≥100): Start dual therapy (Amlodipine 5mg + Telmisartan 40mg OD).
3. If Diabetes present: Target BP is < 130/80 mmHg. Monitor serum creatinine & potassium at 2 weeks.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ['State NCD Clinical Management Handbook 2026'],
      };
    }
  }

  // Admin queries
  if (role === 'admin' || q.includes('spike') || q.includes('outbreak') || q.includes('district')) {
    return {
      sender: 'assistant',
      text: `📊 **State Epidemiological Intelligence Report**:
- **Dengue/Malaria Alert**: Gadchiroli (+38%) and Palghar (+29%) show accelerated monsoon fever caseloads.
- **Medicine Buffer Warning**: Amoxicillin 500mg and Rabies Immunoglobulin are below the 15-day emergency threshold in 4 rural sub-districts.
- **Recommendation**: Trigger emergency buffer reallocation from Pune State Depot and deploy mobile testing squads.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: ['State Health Command Center Realtime Analytics'],
      suggestedActions: [
        { label: 'View Disease Heatmap', action: 'navigate:/admin/heatmaps' },
        { label: 'Check Drug Supply Chain', action: 'navigate:/admin/inventory' },
      ],
    };
  }

  // Patient queries
  if (role === 'patient' || q.includes('medicine') || q.includes('how to take') || q.includes('food')) {
    return {
      sender: 'assistant',
      text: `Namaste! Here is a simple explanation of your medications:
1. **Amlodipine 5mg**: Take 1 tablet every morning after breakfast. This keeps your blood pressure normal and protects your heart.
2. **Metformin 500mg**: Take 1 tablet after morning breakfast and 1 tablet after dinner at night. This keeps your blood sugar balanced.
3. **Important**: Drink plenty of water and do not skip meals. You can also press the "Listen to Audio" button on your prescription page to hear this in Marathi or Hindi!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        { label: 'Play Audio Prescription', action: 'navigate:/patient/audio-prescription' },
      ],
    };
  }

  // Default general response
  return {
    sender: 'assistant',
    text: `I am your MahaAarogya Health AI Assistant. I can assist you with:
- Frontline ASHA task prioritization & maternal danger sign protocols
- Clinical EHR summarization & ICD-11 guidance for doctors
- Tertiary bed availability & referral prioritization for specialists
- Plain-language prescription explanations in Marathi/Hindi for patients
- State-wide disease cluster anomaly detection for administrators.

How may I assist your care workflow right now?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};
