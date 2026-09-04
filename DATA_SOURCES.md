# Data Sources

Every real-world figure used in this project, with the source it came from and
how it was obtained. Anything not listed here is demo data.

The distinction matters: reviewers will ask which numbers are real. Figures in
the "Verified" sections below can be traced to a government publication. Figures
in [Demo data](#demo-data-not-from-a-source) are invented for demonstration and
must not be presented as measurements.

Two kinds of claim are covered here. Sections 1–7 record **reference data** — the
published figures the analytics screens display.
[Screens wired to live data](#screens-wired-to-live-data) records which
**application screens read the database** rather than a fixture, and the two
defects that work uncovered.

---

## Summary

| What | Value | Status |
| --- | --- | --- |
| Maharashtra rural facilities | 12,858 | Verified (NHM) |
| Maharashtra ASHA workers | 70,267 | Verified (NHSRC) |
| Maharashtra ABHA accounts | 7.1 crore | Verified (ABDM) |
| Maharashtra eSanjeevani teleconsultations | 47.8 lakh | Verified (Maharashtra PHD) |
| Essential medicines in the formulary | 387 (all 384 of NLEM 2022) | Verified |
| District-wise facility counts | 33 districts | Verified (NHM), 2011 |
| Population norms per facility tier | SC 5,000 / PHC 30,000 / CHC 1,20,000 | Verified (NHM) |
| Staffing norms per facility tier | See below | Verified (NHM) |
| National shortfall (Mar 2023) | SC 22% / PHC 30% / CHC 36% | Reported, see caveat |
| Bed occupancy, medicine availability | — | Demo data |
| OPD footfall, teleconsultation counts | — | Demo data |
| Screens reading the live database | 13 wired, 1 outstanding | See below |

---

## 1. Three-tier rural health system

The structure the platform models. A patient enters at a sub-centre and is
referred upward as the case requires.

```
Sub-Centre  ->  PHC  ->  CHC  ->  District Hospital
  (ANM)      (1 MO)   (4 specialists)
```

### Population norms

One facility is meant to serve this many people.

| Tier | Plain area | Hilly / tribal area |
| --- | --- | --- |
| Sub-Centre | 5,000 | 3,000 |
| Primary Health Centre (PHC) | 30,000 | 20,000 |
| Community Health Centre (CHC) | 1,20,000 | 80,000 |

Two ratios follow from these norms and are worth stating explicitly, because
they determine what a realistic facility hierarchy looks like:

- **6 sub-centres per PHC** (30,000 / 5,000)
- **4 PHCs per CHC** — stated directly in the source, and consistent with
  1,20,000 / 30,000

### Staffing norms

| Tier | Staff |
| --- | --- |
| Sub-Centre | 1 ANM (Health Worker, Female) + 1 Male Health Worker. One LHV supervises 6 sub-centres. |
| PHC | 1 Medical Officer + 14 paramedical and support staff. 4–6 beds. |
| CHC | 4 specialists — Surgeon, Physician, Gynaecologist, Paediatrician — + 21 paramedical and support staff. 30 beds, OT, X-ray, labour room, laboratory. |

**ASHA norm:** one ASHA per 1,000 rural population.

The single-Medical-Officer norm at a PHC is why the OPD volumes in the doctor
analytics screen are scaled the way they are — see
[Demo data](#demo-data-not-from-a-source).

**Source:** [Rural Health Care System in India (NHM)](https://www.nhm.gov.in/images/pdf/monitoring/rhs/rural-health-care-system-india-final-9-4-2012.pdf)

---

## 2. Maharashtra district-wise facility counts

As on March 2011. This is the most recent NHM publication that breaks the data
down to district level; later editions report state-level totals only.

| District | Sub-Centres | PHCs | CHCs | SDH | DH |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ahmadnagar | 555 | 96 | 23 | 2 | 1 |
| Akola | 178 | 30 | 5 | 1 | 0 |
| Amravati | 333 | 56 | 9 | 4 | 1 |
| Aurangabad | 279 | 50 | 10 | 3 | 0 |
| Beed | 280 | 50 | 12 | 2 | 1 |
| Bhandara | 193 | 33 | 7 | 2 | 1 |
| Buldana | 280 | 52 | 12 | 2 | 1 |
| Chandrapur | 339 | 58 | 11 | 2 | 1 |
| Dhule | 232 | 41 | 6 | 3 | 0 |
| Gadchiroli | 376 | 45 | 9 | 3 | 1 |
| Gondiya | 238 | 39 | 10 | 1 | 1 |
| Hingoli | 132 | 24 | 3 | 1 | 1 |
| Jalgaon | 442 | 77 | 17 | 3 | 1 |
| Jalna | 213 | 40 | 8 | 1 | 1 |
| Kolhapur | 413 | 72 | 16 | 4 | 0 |
| Latur | 252 | 46 | 10 | 2 | 0 |
| Nagpur | 316 | 49 | 9 | 2 | 0 |
| Nanded | 377 | 64 | 12 | 4 | 0 |
| Nandurbar | 290 | 58 | 12 | 1 | 1 |
| Nashik | 577 | 103 | 24 | 4 | 1 |
| Osmanabad | 206 | 42 | 7 | 2 | 1 |
| Parbhani | 214 | 31 | 6 | 2 | 1 |
| Pune | 539 | 96 | 21 | 3 | 1 |
| Raigarh (Raigad) | 288 | 52 | 10 | 3 | 1 |
| Ratnagiri | 378 | 67 | 8 | 3 | 1 |
| Sangli | 320 | 59 | 12 | 2 | 0 |
| Satara | 400 | 71 | 15 | 2 | 1 |
| Sindhudurg | 248 | 38 | 7 | 3 | 1 |
| Solapur | 431 | 77 | 13 | 3 | 0 |
| Thane | 492 | 78 | 14 | 6 | 1 |
| Wardha | 181 | 27 | 6 | 2 | 1 |
| Washim | 153 | 25 | 7 | 0 | 1 |
| Yavatmal | 435 | 63 | 14 | 3 | 0 |
| **Maharashtra total** | **10,580** | **1,809** | **365** | **81** | **23** |

SDH = Sub-Divisional Hospital, DH = District Hospital.

**Extraction check:** all five columns were summed across the 33 districts and
matched the published state totals exactly. This confirms no row was misread
during PDF extraction.

Mumbai City and Mumbai Suburban do not appear — they have no rural PHC network,
so they are absent from rural health tables. This is why Mumbai Suburban was
removed from the district analytics dataset.

**Total facilities = 12,858** (10,580 + 1,809 + 365 + 81 + 23). This is the
`totalFacilities` KPI.

**Source:** [District-wise Availability of Health Centres in India (NHM)](https://www.nhm.gov.in/images/pdf/monitoring/rhs/district-wise-health-centres.pdf)

---

## 3. ASHA workforce

**Maharashtra: 70,267 ASHAs.**

**Source:** [Total ASHAs — National Health Systems Resource Centre](https://nhsrcindia.org/asha-map-table)

**Caveat:** the NHSRC table does not carry a date stamp, so the figure cannot be
tied to a specific year. It is used as an order-of-magnitude state total.

Per-district ASHA counts in the application are **derived, not published**: the
1-ASHA-per-1,000-population norm is applied to each district's sub-centre count
(5,000 people per sub-centre in plain areas, 3,000 in tribal ones). This is why
Gadchiroli and Nandurbar carry proportionally more ASHAs per sub-centre. These
are estimates consistent with official norms, not measurements.

---

## 4. National infrastructure shortfall

As on 31 March 2023. This is the gap between facilities that exist and the
number the population norms call for.

| Tier | Functioning | Rural shortfall |
| --- | ---: | ---: |
| Sub-Centres | 1,69,615 | 22% |
| Primary Health Centres | 31,882 | 30% |
| Community Health Centres | 6,359 | 36% |

The CHC gap is the largest, which is the core problem this platform addresses:
the specialist tier a PHC refers into is the scarcest one, so a substantial
share of upward referrals have no receiving facility. This is the argument for
referral tracking and teleconsultation.

**Caveat — verify before submission.** These 2023 counts and percentages were
taken from reporting and press summaries of the MoHFW publication, **not read
out of the primary PDF**. The norms and staffing data in section 1 *were* read
directly from the NHM source and are solid. Cross-check these figures against
the primary document before using them in a submission.

**Source:** [Health Ministry Releases "Health Dynamics of India (Infrastructure and Human Resources) 2022-23" — PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2053070)

**Naming note:** the annual publication formerly called **Rural Health
Statistics** was renamed **Health Dynamics of India (Infrastructure and Human
Resources)** with the 2022-23 edition, released September 2024. Searching for
the old name will not find current editions.

---

## 5. Digital health adoption

| Indicator | Maharashtra | As of |
| --- | ---: | --- |
| ABHA accounts created | 7.1 crore | ABDM dashboard |
| eSanjeevani teleconsultations (cumulative) | 47,80,259 | December 2024 |

Maharashtra's own Public Health Department also reports that **8,390 sub-centres,
1,900 PHCs and 732 urban PHCs** have a teleconsultation facility — useful context
for the referral and teleconsultation features, since it shows the endpoints
already exist in the field.

These replaced two figures that had no source: a `totalPatientsRegistered` of
4,820,000 labelled "ABHA Digital Records", and a teleconsultation count of
142,800. Both are now real published figures.

Large values render through `formatCrore` (`frontend/src/utils/formatIndianNumber.ts`)
so they read as "7.1 Cr" and "47.8 L" rather than western-grouped digit strings.

**Sources:**
- [Telemedicine — Public Health Department, Government of Maharashtra](https://phd.maharashtra.gov.in/en/scheme/telemedicine/)
- [ABDM public dashboard](https://dashboard.abdm.gov.in/abdm/)

**Caveat:** the ABHA figure is reported as "7.1 crore" in secondary coverage of
the ABDM dashboard; the dashboard itself renders its counters via JavaScript and
could not be read automatically. Treat it as approximate and check the live
dashboard before quoting it precisely.

---

## 6. Essential medicines formulary (NLEM 2022)

India's National List of Essential Medicines, fifth edition, released
13 September 2022: **384 medicines across 27 therapeutic categories**, with 34
added and 26 removed relative to NLEM 2015.

**All 384 are imported.** The formulary grew from 10 medicines to 387 — the 384
NLEM entries plus three programme items already seeded (IFA tablets, ORS
sachets, Vitamin A solution).

### How it was obtained, and how it was checked

The official CDSCO PDF is a **scanned document** — 364 JPEG image streams across
135 pages, with no text layer — so the names could not be read from it directly.
The alphabetical list was taken from a published reproduction, then validated
against independently sourced facts:

| Check | Result |
| --- | --- |
| Unique entries | 384, matching the published count |
| The 34 medicines added in 2022 | all present |
| The 26 medicines removed in 2022 | none present |
| Everyday PHC drugs (Paracetamol, Amoxicillin, Metformin, ORS…) | all present |

Nine tests in `backend/tests/nlem.test.js` enforce these, so the data cannot
drift silently. An earlier partial import left eight near-duplicate spellings —
for example `Ormeloxifene` against the list's `Ormeloxifene (Centchroman)`.
These were merged, with references repointed before deletion so no prescription
was orphaned.

### What is deliberately absent

**Strength and dosage form are not recorded.** The source reproduces names only,
and a guessed strength in a clinical formulary is a safety problem rather than a
cosmetic gap. Prescribing screens treat strength as a field the prescriber
enters, not one the formulary supplies.

**Category is a pharmacological class, not an NLEM section.** NLEM's own 27
section headings are not published machine-readably, so each drug is grouped by
its established use for search and filtering. This is not a claim about NLEM's
structure.

The 26 removed medicines are kept in the same file so the formulary can warn
when someone reaches for a drug no longer on the national list — Ranitidine and
Atenolol are both still widely prescribed out of habit.

**Re-running:** `node scripts/import-nlem.js` is idempotent and matches on name,
so existing prescriptions keep their medicine ids. `--dry-run` reports without
writing.

**Sources:**
- [NLEM 2022 — CDSCO (official, scanned, not machine-readable)](https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadConsumer/nlem2022.pdf)
- [Alphabetical reproduction used for the names](https://pharmafranchisehelp.com/national-list-of-essential-medicines-nlem-2022/)
- [34 added, 26 removed — Medical Dialogues](https://medicaldialogues.in/news/industry/pharma/union-health-ministry-releases-nlem-2022-34-drugs-added-26-removed-99083)
- [NLEM 2022 additions — Business Today](https://www.businesstoday.in/latest/story/national-list-of-essential-medicines-nlem-2022-govt-adds-34-new-drugs-four-anti-cancer-medicines-347146-2022-09-13)

---

## 7. Mortality indicators

| Indicator | Maharashtra | National |
| --- | ---: | ---: |
| Maternal Mortality Ratio (per 100,000 live births) | 33 | 97 |
| Infant Mortality Rate (per 1,000 live births) | 16 | — |

These were already present in the project and are consistent with SRS bulletin
values for Maharashtra. They were **not independently re-verified** during this
pass — treat them as unconfirmed until checked against a current SRS bulletin.

---

## Demo data (not from a source)

These values are invented for demonstration. They are labelled in code and must
not be presented as real measurements.

| Field | Where | Why it is not real |
| --- | --- | --- |
| `bedOccupancyRate` | District analytics | No district-wise published figure was found. |
| `medicineAvailabilityRate` | District analytics | No district-wise published figure was found. |
| Weekly OPD footfall (12–42/day) | Doctor analytics | No published OPD-per-day norm exists in the NHM sources. Scaled to what one Medical Officer at a 30,000-population PHC could plausibly see, rather than to a district-hospital volume. |
| Teleconsultation counts | Doctor analytics | Demo throughput. |
| Antibiotic prescription %, follow-up compliance | Doctor analytics | Demo clinical quality indicators. |
| NCD burden percentages | State analytics | Plausible but not traced to a source. |
| Patient, facility and queue records | Seed data | Fictional, `demo-` prefixed. |

### Claims removed as unsupportable

These sub-labels sat under the admin dashboard KPI cards and asserted things no
source backed. They were removed rather than restated, because each would invite
a question with no defensible answer.

| Removed | Why |
| --- | --- |
| "100% On-grid" | Asserted that all 12,858 facilities were connected. Not plausible, and contradicted by the 22–36% infrastructure shortfall on the same screen. |
| "98.4% Sync Rate" | Invented operational metric. Replaced with the ASHA caseload norm, which is real. |
| "+14.2k this week" | Invented growth rate. |
| "eSanjeevani Integrated" | Implied a live integration that does not exist. Replaced with the source and period of the figure. |

---

## Screens wired to live data

The figures above are reference data. Separately, thirteen screens were rendering
hardcoded arrays while the backend already served the same records. Each now
reads from the API, so what a reviewer clicks is the database, not a fixture.

None of these files import `data/mockData` any more.

| Screen | Was showing | Now reads |
| --- | --- | --- |
| `admin/AuditLogs.tsx` | 5 invented entries | 71 real audit rows, including the reviewer's own logins |
| `asha/Immunization.tsx` | 4 invented children | 120 vaccination records; recording a dose writes to the database |
| `asha/NcdScreening.tsx` | saved nothing | Screening is saved; CBAC scored server-side |
| `asha/RegisterPatient.tsx` | fabricated ABHA numbers | ABHA optional, never generated |
| `specialist/BedAvailability.tsx` | 11 invented beds | 58 real beds, live over SSE |
| `specialist/Discharge.tsx` | 3 hardcoded ABHA numbers | Patient register |
| `doctor/LabOrders.tsx` | fixture orders | 120 lab orders; the worklist advances for real |
| `patient/Dashboard.tsx` | another patient's record | The signed-in patient's own |
| `patient/Prescriptions.tsx` | fixture prescriptions | Their own prescriptions |
| `patient/LabReports.tsx` | fixture lab orders | Their own lab orders |
| `patient/Vaccinations.tsx` | 4 invented doses | Their own immunisation record |
| `patient/ReferralStatus.tsx` | fixture referrals | Their own referrals |
| `patient/Timeline.tsx` | 8 invented clinical events | Their own longitudinal record |

Three APIs were fully built, held seeded data, and were called by nothing:
`/api/vaccinations` (120 rows), `/api/ncd-screenings` (120 rows) and
`/api/lab-orders` (120 rows). All three are now connected.

### Two defects this surfaced

**The community health centre had no beds.** Bed seeding covered the PHC and the
medical college but skipped the CHC entirely, so a referral escalating out of a
PHC had no CHC bed to arrive at — the product demonstrated the opposite of the
argument in [section 4](#4-national-infrastructure-shortfall). Bed counts now
follow the norms for each tier; see [Bed capacity per tier](#bed-capacity-per-tier).

**The CBAC score was computed twice, differently.** `asha/NcdScreening.tsx`
carried its own scoring formula while the backend already implemented the
published NPCDCS scoring in `backend/src/services/cbacService.js`. The two
disagreed: across 640 combinations of age, sex, waist, tobacco, alcohol,
activity and family history, the scores differed in **60%** of cases and the
**referral decision itself flipped in 9%** — roughly one screening in eleven
would have been referred when it should not have been, or the reverse. Scoring
now happens only on the server; the browser sends measurements and reads the
assessment back.

### Fabricated identifiers removed

Every generated or hardcoded ABHA number is gone. `RegisterPatient.tsx` had a
"Generate ABHA ID" button that produced a random 12-digit number, a silent
fallback that invented one when the field was left blank, and a success message
claiming the patient "has been enrolled into the Maharashtra Health Grid".
`specialist/Discharge.tsx` held three fixed ABHA numbers mapped to patient names.

An ABHA number is issued by ABDM against verified Aadhaar or mobile OTP and
cannot be minted locally. Registration now records the number a patient already
holds, leaves it blank otherwise, and states that care is not blocked while it is
pending.

### Where data was genuinely unavailable

Some fields the old fixtures displayed have no API behind them. These were
removed rather than filled with plausible values:

| Removed | Reason |
| --- | --- |
| Facility and administering staff on the vaccination certificate | The immunisation API returns neither |
| `consentRef` on every audit row | No consent-reference field exists in the schema |
| "NORMAL" flag on lab orders with no result | A flag before a result is clinically wrong |

`admin/StaffManagement.tsx` still renders a fixture. There is no staff-listing
endpoint — `/api/staff-access` handles access requests, not a directory — so
wiring it needs a new API rather than a frontend change.

---

## Sources that could not be retrieved

Documented so the same ground is not re-covered.

| Source | Result |
| --- | --- |
| [data.gov.in](https://www.data.gov.in/) | HTTP 403 to automated requests. |
| `api.data.gov.in` | HTTP 400 — requires a registered API key (free). |
| PIB press releases | Blocked to automated fetch; content reached via search summaries only. |
| Asian Development Bank | Blocked to automated fetch. |

**District-level HMIS data more recent than 2011 was not obtainable
automatically.** To get it, either register a free `data.gov.in` API key or
download the current Health Dynamics of India edition manually.

**Beneficiary-level ASHA patient records are deliberately not sought.** They are
protected health information and are not published by any government portal.

---

## Where these figures are used in the code

| Data | File |
| --- | --- |
| State KPIs, district stats, infrastructure gap | `frontend/src/data/mockData.ts` |
| Infrastructure gap chart, state KPI cards | `frontend/src/pages/admin/StateAnalytics.tsx` |
| District table and choropleth | `frontend/src/pages/admin/DistrictAnalytics.tsx` |
| OPD volume chart | `frontend/src/pages/doctor/DoctorAnalytics.tsx` |
| Landing page facility and ASHA claims | `frontend/src/pages/public/Home.tsx` |
| Demo facilities and sub-centre hierarchy | `backend/src/db/seeds/index.js` |
| NLEM 2022 formulary data | `backend/src/db/data/nlem2022.js` |
| Formulary import (idempotent) | `backend/scripts/import-nlem.js` |
| Formulary guard tests | `backend/tests/nlem.test.js` |
| Lakh/crore number formatting | `frontend/src/utils/formatIndianNumber.ts` |
| CBAC scoring (server-side, authoritative) | `backend/src/services/cbacService.js` |
| API access for every wired screen | `frontend/src/services/api/dataService.ts` |

The landing page reads its facility and ASHA figures from `MAHARASHTRA_STATE_KPIS`
rather than repeating them as literals, so the headline claim cannot drift out of
step with the analytics screens.

---

## Seeded facility hierarchy

The demo facilities follow the real population norms rather than an arbitrary
shape, so the referral chain demonstrates a correctly proportioned pyramid:

```
6 Sub-Centres  ->  PHC Paud  ->  CHC Mulshi  ->  District Hospital Aundh
                                              -> B.J. Medical College (Sassoon)
```

Six sub-centres per PHC follows from the norms (30,000 / 5,000). The six villages
— Kolvan, Ghotawade, Bhukum, Lavale, Hadshi and Male — are real settlements in
Mulshi taluka, Pune district, confirmed against Census 2011 along with their
populations (1,247 / 2,280 / 2,859 / 6,732 / 936 / 1,038).

PHC Shirur in Ahmednagar is deliberately left without sub-centres: one complete,
correctly proportioned pyramid demonstrates the hierarchy, and inventing village
names for a second district would add unverified data for no demonstrative gain.

### Bed capacity per tier

Bed counts follow the norm for each tier, so an escalating referral arrives at a
facility actually equipped to receive it.

| Facility | Beds | Composition |
| --- | ---: | --- |
| PHC Paud | 6 | 4 general + 2 emergency. **No ICU** — a PHC has 4–6 beds and no critical care under the norm. |
| CHC Mulshi | 30 | 16 general + 8 maternity + 4 emergency + 2 ICU, matching the 30-bed CHC norm and its four specialist departments. |
| B.J. Medical College | 22 | 6 ICU + 8 general + 4 ventilator + 4 maternity — tertiary critical care. |

Before this correction the CHC tier had **no beds at all** while the PHC held 5,
so a referral escalating out of a PHC skipped the CHC entirely. The bed board is
where the CHC shortfall in section 4 becomes visible in the product.

The 13 facilities and 120 patients shown on the landing page are live counts
queried from the database, not fixed figures — they change as the demo is used.

**Source:** [Mulshi taluka villages, Census 2011](https://www.census2011.co.in/data/subdistrict/4192-mulshi-pune-maharashtra.html)

Maharashtra's village count (40,959) on the landing page is from the same census
series.
