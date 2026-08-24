/**
 * Drug interaction checking.
 *
 * The dataset below is a small, deliberately conservative set of well-known,
 * widely-documented interaction pairs. It is NOT a complete clinical reference
 * and is not a substitute for a pharmacist or an authoritative source.
 *
 * Interactions are never invented at runtime: an unrecognised pair returns "no
 * known interaction in this dataset", not a guess (§33). The store is kept
 * separate from the lookup logic so it can be swapped for a licensed clinical
 * database without touching callers.
 */

const INTERACTIONS = [
  {
    drugs: ['warfarin', 'aspirin'],
    severity: 'HIGH',
    effect: 'Substantially increased bleeding risk.',
    guidance: 'Avoid combining unless specifically directed and monitored by a clinician.',
  },
  {
    drugs: ['warfarin', 'ibuprofen'],
    severity: 'HIGH',
    effect: 'Increased bleeding risk and possible GI ulceration.',
    guidance: 'Avoid NSAIDs with warfarin; consider paracetamol for analgesia after clinical review.',
  },
  {
    drugs: ['metformin', 'contrast'],
    severity: 'HIGH',
    effect: 'Risk of lactic acidosis with iodinated contrast media.',
    guidance: 'Metformin is usually withheld around contrast imaging on clinical advice.',
  },
  {
    drugs: ['ace inhibitor', 'potassium'],
    severity: 'MEDIUM',
    effect: 'Additive hyperkalaemia risk.',
    guidance: 'Monitor serum potassium; clinician review before combining.',
  },
  {
    drugs: ['enalapril', 'spironolactone'],
    severity: 'MEDIUM',
    effect: 'Additive hyperkalaemia risk.',
    guidance: 'Monitor serum potassium and renal function.',
  },
  {
    drugs: ['ciprofloxacin', 'antacid'],
    severity: 'MEDIUM',
    effect: 'Reduced absorption of the antibiotic, lowering effectiveness.',
    guidance: 'Separate administration by at least two hours.',
  },
  {
    drugs: ['rifampicin', 'oral contraceptive'],
    severity: 'HIGH',
    effect: 'Reduced contraceptive effectiveness.',
    guidance: 'Additional contraceptive precautions are required during and after treatment.',
  },
  {
    drugs: ['amlodipine', 'simvastatin'],
    severity: 'MEDIUM',
    effect: 'Raised simvastatin levels, increasing myopathy risk.',
    guidance: 'Dose limits apply; clinician review recommended.',
  },
  {
    drugs: ['digoxin', 'furosemide'],
    severity: 'MEDIUM',
    effect: 'Diuretic-induced hypokalaemia increases digoxin toxicity risk.',
    guidance: 'Monitor electrolytes and digoxin levels.',
  },
  {
    drugs: ['methotrexate', 'trimethoprim'],
    severity: 'HIGH',
    effect: 'Additive antifolate effect causing marrow suppression.',
    guidance: 'Avoid this combination.',
  },
];

const SEVERITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function normalize(name) {
  return String(name || '').toLowerCase().trim();
}

/** Matches on substrings so "Tab Warfarin 5mg" still resolves to warfarin. */
function mentions(input, term) {
  return input.includes(term);
}

export function checkInteractions(medicines = []) {
  const normalized = medicines.map(normalize).filter(Boolean);
  const found = [];

  for (const entry of INTERACTIONS) {
    const [a, b] = entry.drugs;
    const hasA = normalized.some((m) => mentions(m, a));
    const hasB = normalized.some((m) => mentions(m, b));

    if (hasA && hasB) {
      found.push({
        drugs: entry.drugs,
        severity: entry.severity,
        effect: entry.effect,
        guidance: entry.guidance,
      });
    }
  }

  const severity = found.reduce(
    (highest, item) => (SEVERITY_RANK[item.severity] > SEVERITY_RANK[highest] ? item.severity : highest),
    'LOW'
  );

  const recommendation = found.length === 0
    ? 'No interaction was found for these medicines in this dataset. This does not guarantee that none exists — verify against a full clinical reference.'
    : severity === 'HIGH'
    ? 'A high-severity interaction was found. Do not dispense without clinician or pharmacist review.'
    : 'A potential interaction was found. Clinician or pharmacist review is advised.';

  return {
    interactions: found,
    severity: found.length ? severity : 'LOW',
    recommendation,
    checked: medicines,
    coverage: {
      pairsInDataset: INTERACTIONS.length,
      note: 'Limited curated dataset of well-documented interactions. Not a complete clinical reference.',
    },
  };
}
