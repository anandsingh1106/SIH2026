/**
 * Schematic district geometry for Maharashtra.
 *
 * IMPORTANT: these are hand-authored polygons on a 1000x760 canvas, not
 * surveyed boundaries. Relative position, adjacency and rough proportion are
 * faithful enough to read as Maharashtra and to point at a district; the
 * outlines are not. Nothing cartographically authoritative should be derived
 * from them -- they exist so the dashboard can show *where* a number is,
 * without shipping a multi-megabyte GeoJSON or depending on a tile server
 * that an offline-first deployment cannot reach.
 *
 * Divisions follow the state's six revenue divisions.
 */

export type Division =
  | 'Konkan'
  | 'Pune'
  | 'Nashik'
  | 'Chhatrapati Sambhajinagar'
  | 'Amravati'
  | 'Nagpur';

export interface DistrictShape {
  /** Must match a name in MAHARASHTRA_DISTRICTS exactly. */
  name: string;
  division: Division;
  /** SVG polygon points on the 1000x760 viewBox. */
  points: string;
  /** Label anchor; kept separate because a polygon centroid often lands badly. */
  labelX: number;
  labelY: number;
  /** Short label for cramped districts. */
  short?: string;
}

export const GEO_WIDTH = 1000;
export const GEO_HEIGHT = 760;

export const MAHARASHTRA_GEO: DistrictShape[] = [
  // ── Konkan division: the coastal strip down the west edge ────────────────
  {
    name: 'Palghar',
    division: 'Konkan',
    points: '96,150 168,140 196,186 178,236 120,246 92,206',
    labelX: 140, labelY: 196,
  },
  {
    name: 'Thane',
    division: 'Konkan',
    points: '120,246 178,236 232,252 240,306 176,326 128,300',
    labelX: 182, labelY: 288,
  },
  {
    name: 'Mumbai Suburban',
    division: 'Konkan',
    points: '86,254 122,248 130,300 96,314 74,286',
    labelX: 102, labelY: 284, short: 'Mum. Sub.',
  },
  {
    name: 'Mumbai City',
    division: 'Konkan',
    points: '74,318 100,314 106,350 78,356 66,336',
    labelX: 86, labelY: 336, short: 'Mumbai',
  },
  {
    name: 'Raigad',
    division: 'Konkan',
    points: '96,356 176,326 226,352 214,428 138,442 92,404',
    labelX: 156, labelY: 390,
  },
  {
    name: 'Ratnagiri',
    division: 'Konkan',
    points: '112,446 190,436 216,486 196,566 130,576 100,510',
    labelX: 158, labelY: 506,
  },
  {
    name: 'Sindhudurg',
    division: 'Konkan',
    points: '130,580 196,570 214,624 178,684 128,668 112,616',
    labelX: 162, labelY: 626,
  },

  // ── Nashik division: north-west interior ─────────────────────────────────
  {
    name: 'Nandurbar',
    division: 'Nashik',
    points: '210,58 292,44 322,92 288,138 218,132 194,96',
    labelX: 254, labelY: 94,
  },
  {
    name: 'Dhule',
    division: 'Nashik',
    points: '288,138 322,92 396,102 412,156 358,196 300,184',
    labelX: 348, labelY: 146,
  },
  {
    name: 'Jalgaon',
    division: 'Nashik',
    points: '412,156 396,102 486,96 536,132 526,196 444,208',
    labelX: 470, labelY: 154,
  },
  {
    name: 'Nashik',
    division: 'Nashik',
    points: '218,204 300,184 358,196 366,268 296,296 224,270',
    labelX: 294, labelY: 240,
  },
  {
    name: 'Ahmednagar',
    division: 'Nashik',
    points: '296,296 366,268 452,282 470,364 392,404 314,368',
    labelX: 386, labelY: 336,
  },

  // ── Pune division: western Maharashtra ───────────────────────────────────
  {
    name: 'Pune',
    division: 'Pune',
    points: '226,352 296,296 314,368 300,436 226,452 208,404',
    labelX: 262, labelY: 388,
  },
  {
    name: 'Satara',
    division: 'Pune',
    points: '214,456 300,440 330,496 302,556 234,560 200,506',
    labelX: 266, labelY: 502,
  },
  {
    name: 'Sangli',
    division: 'Pune',
    points: '302,560 372,540 412,584 388,640 316,646 288,608',
    labelX: 348, labelY: 594,
  },
  {
    name: 'Kolhapur',
    division: 'Pune',
    points: '214,624 288,608 316,646 300,700 226,706 198,664',
    labelX: 256, labelY: 660,
  },
  {
    name: 'Solapur',
    division: 'Pune',
    points: '392,404 470,364 546,392 556,472 470,514 400,478',
    labelX: 474, labelY: 440,
  },

  // ── Chhatrapati Sambhajinagar (Marathwada) ───────────────────────────────
  {
    name: 'Chhatrapati Sambhajinagar',
    division: 'Chhatrapati Sambhajinagar',
    points: '444,208 526,196 566,246 540,306 466,308 436,264',
    labelX: 500, labelY: 254, short: 'Ch. Sambhajinagar',
  },
  {
    name: 'Jalna',
    division: 'Chhatrapati Sambhajinagar',
    points: '566,246 634,232 668,278 640,330 566,336 540,296',
    labelX: 604, labelY: 286,
  },
  {
    name: 'Beed',
    division: 'Chhatrapati Sambhajinagar',
    points: '466,308 540,306 566,336 552,404 480,414 452,362',
    labelX: 508, labelY: 360,
  },
  {
    name: 'Parbhani',
    division: 'Chhatrapati Sambhajinagar',
    points: '640,330 668,278 736,290 750,346 692,378 646,368',
    labelX: 694, labelY: 330,
  },
  {
    name: 'Hingoli',
    division: 'Chhatrapati Sambhajinagar',
    points: '668,278 700,234 762,240 776,286 736,290',
    labelX: 722, labelY: 268,
  },
  {
    name: 'Nanded',
    division: 'Chhatrapati Sambhajinagar',
    points: '750,346 776,286 856,300 872,372 800,406 744,388',
    labelX: 806, labelY: 348,
  },
  {
    name: 'Latur',
    division: 'Chhatrapati Sambhajinagar',
    points: '646,368 692,378 744,388 736,452 664,462 636,418',
    labelX: 690, labelY: 416,
  },
  {
    name: 'Dharashiv',
    division: 'Chhatrapati Sambhajinagar',
    points: '552,404 636,418 664,462 640,516 566,516 546,458',
    labelX: 604, labelY: 464,
  },

  // ── Amravati division: western Vidarbha ──────────────────────────────────
  {
    name: 'Buldhana',
    division: 'Amravati',
    points: '536,132 606,124 636,170 618,224 552,232 526,190',
    labelX: 580, labelY: 178,
  },
  {
    name: 'Akola',
    division: 'Amravati',
    points: '636,170 690,158 714,198 690,240 636,236 618,204',
    labelX: 668, labelY: 200,
  },
  {
    name: 'Washim',
    division: 'Amravati',
    points: '690,240 714,198 762,206 776,246 720,258',
    labelX: 736, labelY: 228,
  },
  {
    name: 'Amravati',
    division: 'Amravati',
    points: '690,158 700,100 774,94 800,146 776,200 714,198',
    labelX: 744, labelY: 148,
  },
  {
    name: 'Yavatmal',
    division: 'Amravati',
    points: '776,246 800,200 866,214 884,286 812,304 762,282',
    labelX: 822, labelY: 254,
  },

  // ── Nagpur division: eastern Vidarbha ────────────────────────────────────
  {
    name: 'Wardha',
    division: 'Nagpur',
    points: '800,146 856,138 886,180 866,222 812,214 788,180',
    labelX: 836, labelY: 180,
  },
  {
    name: 'Nagpur',
    division: 'Nagpur',
    points: '856,138 872,80 936,76 962,128 934,176 886,180',
    labelX: 908, labelY: 128,
  },
  {
    name: 'Bhandara',
    division: 'Nagpur',
    points: '934,176 962,128 1006,136 1016,186 972,212',
    labelX: 972, labelY: 172,
  },
  {
    name: 'Gondia',
    division: 'Nagpur',
    points: '962,128 976,74 1030,68 1046,120 1006,136',
    labelX: 1004, labelY: 106,
  },
  {
    name: 'Chandrapur',
    division: 'Nagpur',
    points: '884,286 866,222 934,222 972,250 964,320 900,336',
    labelX: 920, labelY: 278,
  },
  {
    name: 'Gadchiroli',
    division: 'Nagpur',
    points: '964,320 972,250 1016,240 1040,300 1014,388 954,382',
    labelX: 996, labelY: 316,
  },
];

/** Lookup by district name. */
export const GEO_BY_NAME: Record<string, DistrictShape> = Object.fromEntries(
  MAHARASHTRA_GEO.map((d) => [d.name, d])
);
