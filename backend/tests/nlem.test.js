import { describe, it, expect } from 'vitest';
import {
  NLEM_2022_MEDICINES,
  NLEM_2022_REMOVED,
  NLEM_2022_META,
} from '../src/db/data/nlem2022.js';

/**
 * These guard the sourced formulary data against silent drift. Every figure
 * asserted here was read from a citation recorded in nlem2022.js — if someone
 * extends the list from memory, the counts stop matching the published edition
 * and these fail.
 */
describe('NLEM 2022 reference data', () => {
  it('records the published edition figures', () => {
    expect(NLEM_2022_META.totalMedicines).toBe(384);
    expect(NLEM_2022_META.therapeuticCategories).toBe(27);
    expect(NLEM_2022_META.addedFrom2015).toBe(34);
    expect(NLEM_2022_META.removedFrom2015).toBe(26);
  });

  it('carries exactly the 34 medicines added in the 2022 revision', () => {
    const added = NLEM_2022_MEDICINES.filter((m) => m.addedIn2022);
    expect(added).toHaveLength(NLEM_2022_META.addedFrom2015);
  });

  it('carries exactly the 26 medicines removed in the 2022 revision', () => {
    expect(NLEM_2022_REMOVED).toHaveLength(NLEM_2022_META.removedFrom2015);
  });

  it('has no duplicate medicine names', () => {
    const names = NLEM_2022_MEDICINES.map((m) => m.name.trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('never lists a medicine as both added and removed', () => {
    const removed = new Set(NLEM_2022_REMOVED.map((n) => n.trim().toLowerCase()));
    const clash = NLEM_2022_MEDICINES.filter((m) => removed.has(m.name.trim().toLowerCase()));
    expect(clash).toEqual([]);
  });

  it('gives every medicine a name and a category', () => {
    for (const med of NLEM_2022_MEDICINES) {
      expect(med.name?.trim()).toBeTruthy();
      expect(med.category?.trim()).toBeTruthy();
    }
  });

  it('holds the complete published list of 384 medicines', () => {
    expect(NLEM_2022_MEDICINES).toHaveLength(NLEM_2022_META.totalMedicines);
  });

  it('contains the medicines a rural PHC actually prescribes', () => {
    // A spot check that the list is the real formulary and not a partial one:
    // these are the everyday drugs a primary health centre dispenses.
    const names = new Set(NLEM_2022_MEDICINES.map((m) => m.name.toLowerCase()));
    for (const drug of [
      'paracetamol', 'ibuprofen', 'amoxicillin', 'azithromycin', 'metformin',
      'amlodipine', 'oral rehydration salts', 'folic acid', 'albendazole',
    ]) {
      expect(names.has(drug), `${drug} missing from the formulary`).toBe(true);
    }
  });

  it('follows the published list order closely', () => {
    // The source is alphabetical, but combination entries sort on their full
    // text ("Ferrous Salts (A) + Folic Acid (B)" precedes "Ferrous salts", and
    // "DPT vaccine" precedes "DPT + Hib + Hep B vaccine"), so a handful of
    // adjacent pairs invert under a naive comparison. This asserts the order is
    // broadly alphabetical rather than shuffled — enough to catch a list that
    // was reordered or spliced, without encoding the source's tie-breaking.
    const names = NLEM_2022_MEDICINES.map((m) => m.name.toLowerCase());
    const key = (s) => s.replace(/[^a-z]/g, '');
    let inversions = 0;
    for (let i = 1; i < names.length; i += 1) {
      if (key(names[i - 1]) > key(names[i])) inversions += 1;
    }
    expect(inversions).toBeLessThan(10);
  });
});
