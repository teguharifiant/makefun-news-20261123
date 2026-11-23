// news-image-20261123 — "The World in One Day"
// A deterministic Node 22 program (standard library only, no network) that
// draws one image summing up the world news of Monday 23 November 2026 and
// writes it to /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png).
//
// The image is drawn entirely in code: a 5x7 bitmap font, flat vector
// pictograms and a newspaper front-page layout. Nothing is read from disk
// except this file, so two runs always write the same bytes.
//
// NEWS DATA: the stories live in the NEWS array below. To refresh the image
// for the day's real news, edit only that array (keep every headline and
// summary short, factual and sourced) and re-run. Do not invent events.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const PAPER: [number, number, number] = [247, 243, 234]; // newsprint
const INK: [number, number, number] = [20, 20, 20];
const NAVY: [number, number, number] = [18, 38, 74];
const RED: [number, number, number] = [178, 34, 34];
const WHITE: [number, number, number] = [255, 255, 255];
const GREY: [number, number, number] = [90, 88, 82];

const px = new Uint8Array(W * H * 4);
function fill(c: [number, number, number]): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 4] = c[0]; px[i * 4 + 1] = c[1]; px[i * 4 + 2] = c[2]; px[i * 4 + 3] = 255;
  }
}
function setPixel(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
}
function rect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
}
function circle(cx: number, cy: number, r: number, c: [number, number, number]): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r) setPixel(cx + x, cy + y, c);
  }
}
function ring(cx: number, cy: number, r: number, t: number, c: [number, number, number]): void {
  for (let y = -r - t; y <= r + t; y++) for (let x = -r - t; x <= r + t; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d >= r - t && d <= r + t) setPixel(cx + x, cy + y, c);
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: [number, number, number]): void {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= n; i++) setPixel(Math.round(x0 + (dx * i) / n), Math.round(y0 + (dy * i) / n), c);
}
function thickLine(x0: number, y0: number, x1: number, y1: number, t: number, c: [number, number, number]): void {
  for (let ox = -t; ox <= t; ox++) for (let oy = -t; oy <= t; oy++) line(x0 + ox, y0 + oy, x1 + ox, y1 + oy, c);
}
function triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: [number, number, number]): void {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
    const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
    const cc = 1 - a - b;
    if (a >= 0 && b >= 0 && cc >= 0) setPixel(x, y, c);
  }
}
function star(cx: number, cy: number, r: number, c: [number, number, number]): void {
  // Four-point star: two overlapping triangles.
  triangle(cx, cy - r, cx + Math.round(r * 0.35), cy, cx, cy + r, c);
  triangle(cx - r, cy, cx, cy - Math.round(r * 0.35), cx + r, cy, c);
  circle(cx, cy, Math.round(r * 0.28), c);
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font (uppercase letters, digits, punctuation).
// Each glyph is 7 rows of 5 bits, '#' = on, '.' = off.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '@': ['01110', '10001', '10111', '10101', '10110', '10000', '01110'],
  '•': ['00000', '00000', '01100', '01100', '01100', '00000', '00000'],
  '—': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '×': ['00000', '10001', '01010', '00100', '01010', '10001', '00000'],
};
const BLANK = ['00000', '00000', '00000', '00000', '00000', '00000', '00000'];

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}
function drawChar(x: number, y: number, scale: number, c: [number, number, number], ch: string): void {
  const g = FONT[ch] ?? BLANK;
  for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
    if (g[r][col] === '1') rect(x + col * scale, y + r * scale, scale, scale, c);
  }
}
function drawText(x: number, y: number, scale: number, c: [number, number, number], text: string): number {
  const t = text.toUpperCase();
  for (let i = 0; i < t.length; i++) drawChar(x + i * 6 * scale, y, scale, c, t[i]);
  return textWidth(t, scale);
}
function drawTextCentered(cx: number, y: number, scale: number, c: [number, number, number], text: string): void {
  drawText(cx - Math.floor(textWidth(text.toUpperCase(), scale) / 2), y, scale, c, text);
}
function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.toUpperCase().split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur === '' ? w : cur + ' ' + w;
    if (textWidth(next, scale) <= maxWidth) cur = next;
    else { if (cur !== '') lines.push(cur); cur = w; }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}
function drawWrapped(x: number, y: number, scale: number, c: [number, number, number], text: string, maxWidth: number, lineGap: number): number {
  const lines = wrapText(text, maxWidth, scale);
  lines.forEach((ln, i) => drawText(x, y + i * (7 * scale + lineGap), scale, c, ln));
  return lines.length;
}

// ---------------------------------------------------------------------------
// PNG encoder (deterministic: fixed filter 0, fixed zlib level, no ancillaries)
// ---------------------------------------------------------------------------
function crc32(buf: Buffer): number {
  let table = (crc32 as unknown as { t?: Int32Array }).t;
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    (crc32 as unknown as { t: Int32Array }).t = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0;
    raw.set(px.subarray(y * W * 4, (y + 1) * W * 4), y * (1 + W * 4) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The news — Monday 23 November 2026
// Sources (checked 23 Nov 2026, morning WIB, after the bounty opened):
// Reuters, AP, BBC, CNN, Le Monde, NPR, EU Today, PAP / Polskie Radio.
// Poland is represented at the NATO council by Deputy Defence Minister
// Pawel Zalewski. The council meets during the day in Brussels, so its
// outcome is not yet known and is not claimed here. Every headline below
// is as reported; nothing here is invented. The NATO council session is
// the day's own event (Monday 23 November, Brussels); the other stories
// are the weekend's big developments leading the day.
// If real 23 November news changes the picture, edit this array only.
// ---------------------------------------------------------------------------
type Story = {
  kicker: string;
  headline: string;
  summary: string;
  accent: [number, number, number];
  icon: 'shield' | 'globe' | 'tanker' | 'building' | 'bars' | 'scales';
};
const LEAD: Story = {
  kicker: 'EUROPE • SECURITY',
  headline: 'NATO MEETS TODAY',
  summary: 'TWO RUSSIAN MISSILES AND A DRONE LAND IN POLAND. NATO\'S COUNCIL MEETS IN BRUSSELS TODAY.',
  accent: NAVY,
  icon: 'shield',
};
const STORIES: Story[] = [
  {
    kicker: 'CLIMATE • TURKIYE',
    headline: 'COP31 COLLAPSES',
    summary: 'NO DEAL. EU REJECTS DRAFT WITH NO FOSSIL FUELS. LONGEST COP EVER.',
    accent: [34, 120, 84],
    icon: 'globe',
  },
  {
    kicker: 'MIDDLE EAST • GULF',
    headline: 'GULF ON EDGE',
    summary: 'IRAN STRIKES TANKERS AND A BAHRAIN SITE.',
    accent: [176, 92, 12],
    icon: 'tanker',
  },
  {
    kicker: 'UKRAINE • WAR',
    headline: '14 MISSING IN KYIV',
    summary: 'DRONE HITS FLAT BLOCK. RESCUE UNDER WAY.',
    accent: [150, 40, 40],
    icon: 'building',
  },
  {
    kicker: 'MEXICO • CRIME',
    headline: 'CARTEL BOSS CAUGHT',
    summary: "'EL CHAPO ISIDRO' SEIZED IN SINALOA. 11 KILLED.",
    accent: [90, 60, 140],
    icon: 'bars',
  },
  {
    kicker: 'JUSTICE • ASIA',
    headline: 'MYANMAR GUILTY',
    summary: 'WORLD COURT RULES GENOCIDE AGAINST ROHINGYA.',
    accent: [20, 90, 130],
    icon: 'scales',
  },
];
const TICKER =
  'ALSO: MARKETS SLIDE AS AI SELLOFF SPREADS • SPARTA II STILL BURNING IN BALTIC AFTER DRONE STRIKE • INDONESIA FACTORY FIRE: 7 BODY BAGS, 50 MISSING • BEPICOLOMBO REACHES MERCURY AFTER 8 YEARS';

// ---------------------------------------------------------------------------
// Pictograms — flat, bold shapes drawn in the story's accent colour.
// ---------------------------------------------------------------------------
function drawIcon(icon: Story['icon'], cx: number, cy: number, r: number, c: [number, number, number]): void {
  if (icon === 'shield') {
    // Shield with a star, three missile streaks above it.
    triangle(cx - 34, cy - 26, cx + 34, cy - 26, cx, cy + 38, c);
    rect(cx - 34, cy - 34, 68, 12, c);
    star(cx, cy - 2, 16, RED);
    line(cx - 44, cy - 44, cx - 20, cy - 34, RED);
    line(cx, cy - 50, cx, cy - 36, RED);
    line(cx + 44, cy - 44, cx + 20, cy - 34, RED);
  } else if (icon === 'globe') {
    // Earth with a red slash: the climate deal that failed.
    ring(cx, cy, 34, 4, c);
    line(cx - 34, cy, cx + 34, cy, c);
    line(cx, cy - 34, cx, cy + 34, c);
    line(cx - 24, cy - 24, cx + 24, cy + 24, c);
    thickLine(cx - 40, cy + 40, cx + 40, cy - 40, 2, RED);
  } else if (icon === 'tanker') {
    // Oil tanker on waves, flame on deck.
    rect(cx - 44, cy - 6, 88, 16, c);
    rect(cx - 30, cy - 22, 18, 16, c);
    rect(cx - 6, cy - 22, 18, 16, c);
    rect(cx + 18, cy - 22, 14, 16, c);
    triangle(cx + 24, cy - 22, cx + 34, cy - 38, cx + 44, cy - 22, RED);
    line(cx - 48, cy + 24, cx - 16, cy + 24, c);
    line(cx - 8, cy + 24, cx + 24, cy + 24, c);
    line(cx + 32, cy + 24, cx + 48, cy + 24, c);
    line(cx - 40, cy + 34, cx - 8, cy + 34, c);
    line(cx + 0, cy + 34, cx + 40, cy + 34, c);
  } else if (icon === 'building') {
    // Apartment block, one corner broken off, rescue beam.
    rect(cx - 36, cy - 30, 30, 62, c);
    rect(cx - 2, cy - 30, 30, 34, c);
    triangle(cx - 2, cy + 4, cx + 28, cy + 4, cx + 12, cy + 32, c);
    rect(cx - 28, cy - 20, 8, 8, WHITE);
    rect(cx - 28, cy - 2, 8, 8, WHITE);
    rect(cx + 6, cy - 20, 8, 8, WHITE);
    triangle(cx + 34, cy + 32, cx + 52, cy - 10, cx + 58, cy - 4, [230, 190, 60]);
  } else if (icon === 'bars') {
    // Prison bars with a star badge.
    for (let i = 0; i < 5; i++) rect(cx - 40 + i * 20, cy - 34, 8, 68, c);
    rect(cx - 44, cy - 38, 88, 8, c);
    rect(cx - 44, cy + 30, 88, 8, c);
    circle(cx, cy, 15, [230, 190, 60]);
    star(cx, cy, 9, NAVY);
  } else {
    // Scales of justice.
    rect(cx - 3, cy - 34, 6, 62, c);
    rect(cx - 44, cy - 34, 88, 6, c);
    line(cx - 40, cy - 28, cx - 40, cy - 12, c);
    line(cx + 40, cy - 28, cx + 40, cy - 12, c);
    triangle(cx - 52, cy - 12, cx - 28, cy - 12, cx - 40, cy + 6, c);
    triangle(cx + 28, cy - 12, cx + 52, cy - 12, cx + 40, cy + 6, c);
    rect(cx - 16, cy + 28, 32, 6, c);
  }
}

// ---------------------------------------------------------------------------
// Layout — newspaper front page, 1024 x 1024.
// ---------------------------------------------------------------------------
function panel(x: number, y: number, w: number, h: number, accent: [number, number, number]): void {
  rect(x, y, w, h, WHITE);
  rect(x, y, w, 6, accent);
  rect(x, y, w, 1, INK);
  rect(x, y + h - 1, w, 1, INK);
  rect(x, y, 1, h, INK);
  rect(x + w - 1, y, 1, h, INK);
}

function draw(): void {
  fill(PAPER);

  // Masthead.
  drawTextCentered(512, 30, 7, NAVY, 'THE WORLD IN ONE DAY');
  rect(28, 92, 968, 3, INK);
  drawTextCentered(512, 104, 4, INK, 'MONDAY 23 NOVEMBER 2026');
  drawText(28, 104, 2, GREY, 'MAKE.FUN');
  drawText(1024 - 28 - textWidth('NEWS IN ONE IMAGE', 2), 104, 2, GREY, 'NEWS IN ONE IMAGE');

  // Lead story.
  panel(28, 144, 968, 260, LEAD.accent);
  drawText(52, 168, 3, LEAD.accent, LEAD.kicker);
  const leadHeadLines = wrapText(LEAD.headline, 560, 5);
  leadHeadLines.forEach((ln, i) => drawText(52, 200 + i * 40, 5, INK, ln));
  drawWrapped(52, 200 + leadHeadLines.length * 40 + 12, 3, INK, LEAD.summary, 560, 6);
  // Lead pictogram in a navy box.
  rect(656, 168, 316, 212, NAVY);
  drawIcon('shield', 814, 274, 40, WHITE);
  drawTextCentered(814, 348, 2, WHITE, 'NATO • BRUSSELS');

  // Middle row: two stories.
  const row2 = [STORIES[0], STORIES[1]];
  row2.forEach((s, i) => {
    const x = 28 + i * (476 + 16);
    const y = 420;
    panel(x, y, 476, 246, s.accent);
    rect(x + 16, y + 16, 444, 76, s.accent);
    drawIcon(s.icon, x + 238, y + 54, 30, WHITE);
    drawText(x + 16, y + 108, 3, s.accent, s.kicker);
    const hl = wrapText(s.headline, 444, 4);
    hl.forEach((ln, j) => drawText(x + 16, y + 136 + j * 32, 4, INK, ln));
    drawWrapped(x + 16, y + 136 + hl.length * 32 + 2, 3, INK, s.summary, 444, 3);
  });

  // Bottom row: three stories.
  const row3 = [STORIES[2], STORIES[3], STORIES[4]];
  row3.forEach((s, i) => {
    const x = 28 + i * (312 + 16);
    const y = 682;
    panel(x, y, 312, 244, s.accent);
    rect(x + 12, y + 12, 288, 66, s.accent);
    drawIcon(s.icon, x + 156, y + 45, 24, WHITE);
    drawText(x + 12, y + 92, 2, s.accent, s.kicker);
    const hl = wrapText(s.headline, 288, 4);
    hl.forEach((ln, j) => drawText(x + 12, y + 118 + j * 32, 4, INK, ln));
    drawWrapped(x + 12, y + 118 + hl.length * 32 + 6, 2, INK, s.summary, 288, 4);
  });

  // Footer ticker.
  rect(28, 942, 968, 3, INK);
  drawWrapped(28, 956, 2, GREY, TICKER, 968, 4);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
draw();
writeFileSync(join(outDir, 'entry.png'), encodePNG());
