// THE WORLD TODAY — front page for Monday 23 November 2026.
// Node 22, stdlib only. No network, no randomness, no wall clock.
// Writes a deterministic 1024x1024 PNG to $MAKEFUN_OUTPUT_DIR/entry.png
// (default /output). Two runs produce byte-identical output.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;
const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [20, 20, 20];
const RED: [number, number, number] = [178, 34, 34];
const GREY: [number, number, number] = [90, 90, 90];

// 5x7 bitmap font. One glyph per line: 7 rows of 5 bits, comma separated.
// All text is uppercased before drawing, so only A-Z, 0-9 and punctuation.
const FONT: Record<string, string> = {
  A: "01110,10001,10001,11111,10001,10001,10001",
  B: "11110,10001,10001,11110,10001,10001,11110",
  C: "01110,10001,10000,10000,10000,10001,01110",
  D: "11110,10001,10001,10001,10001,10001,11110",
  E: "11111,10000,10000,11110,10000,10000,11111",
  F: "11111,10000,10000,11110,10000,10000,10000",
  G: "01110,10001,10000,10111,10001,10001,01111",
  H: "10001,10001,10001,11111,10001,10001,10001",
  I: "01110,00100,00100,00100,00100,00100,01110",
  J: "00111,00010,00010,00010,00010,10010,01100",
  K: "10001,10010,10100,11000,10100,10010,10001",
  L: "10000,10000,10000,10000,10000,10000,11111",
  M: "10001,11011,10101,10101,10001,10001,10001",
  N: "10001,11001,10101,10011,10001,10001,10001",
  O: "01110,10001,10001,10001,10001,10001,01110",
  P: "11110,10001,10001,11110,10000,10000,10000",
  Q: "01110,10001,10001,10001,10101,10010,01101",
  R: "11110,10001,10001,11110,10100,10010,10001",
  S: "01111,10000,10000,01110,00001,00001,11110",
  T: "11111,00100,00100,00100,00100,00100,00100",
  U: "10001,10001,10001,10001,10001,10001,01110",
  V: "10001,10001,10001,10001,10001,01010,00100",
  W: "10001,10001,10001,10101,10101,11011,10001",
  X: "10001,10001,01010,00100,01010,10001,10001",
  Y: "10001,10001,01010,00100,00100,00100,00100",
  Z: "11111,00001,00010,00100,01000,10000,11111",
  "0": "01110,10001,10011,10101,11001,10001,01110",
  "1": "00100,01100,00100,00100,00100,00100,01110",
  "2": "01110,10001,00001,00110,01000,10000,11111",
  "3": "11111,00010,00100,00010,00001,10001,01110",
  "4": "00010,00110,01010,10010,11111,00010,00010",
  "5": "11111,10000,11110,00001,00001,10001,01110",
  "6": "00110,01000,10000,11110,10001,10001,01110",
  "7": "11111,00001,00010,00100,01000,01000,01000",
  "8": "01110,10001,10001,01110,10001,10001,01110",
  "9": "01110,10001,10001,01111,00001,00010,01100",
  " ": "00000,00000,00000,00000,00000,00000,00000",
  ".": "00000,00000,00000,00000,00000,01100,01100",
  ",": "00000,00000,00000,00000,01100,00100,01000",
  ":": "00000,01100,01100,00000,01100,01100,00000",
  "-": "00000,00000,00000,01110,00000,00000,00000",
  "'": "00100,00100,01000,00000,00000,00000,00000",
  "!": "00100,00100,00100,00100,00100,00000,00100",
  "?": "01110,10001,00001,00110,00100,00000,00100",
  "/": "00001,00010,00010,00100,01000,01000,10000",
  "(": "00010,00100,01000,01000,01000,00100,00010",
  ")": "01000,00100,00010,00010,00010,00100,01000",
  "•": "00000,00100,01110,01110,01110,00100,00000",
  "*": "00000,10101,01110,11111,01110,10101,00000",
};

// --- canvas: RGB buffer, white background ---
const px = new Uint8Array(W * H * 3).fill(255);
function setPix(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setPix(i, j, c);
}
function hline(x: number, y: number, w: number, c: [number, number, number], t = 2): void {
  rect(x, y, w, t, c);
}

// --- text: one glyph cell is 6*scale wide (5 + 1 gap), 7*scale tall ---
function textW(s: string, scale: number): number {
  return s.toUpperCase().length * 6 * scale - scale;
}
function drawChar(ch: string, x: number, y: number, scale: number, c: [number, number, number]): void {
  const g = FONT[ch] ?? FONT["?"];
  const rows = g.split(",");
  for (let r = 0; r < 7; r++)
    for (let col = 0; col < 5; col++)
      if (rows[r][col] === "1") rect(x + col * scale, y + r * scale, scale, scale, c);
}
function drawText(s: string, x: number, y: number, scale: number, c: [number, number, number]): void {
  const up = s.toUpperCase();
  for (let i = 0; i < up.length; i++) drawChar(up[i], x + i * 6 * scale, y, scale, c);
}
function drawCentered(s: string, cx: number, y: number, scale: number, c: [number, number, number]): void {
  drawText(s, cx - Math.floor(textW(s, scale) / 2), y, scale, c);
}
// Greedy word wrap: returns lines that fit maxW pixels at the given scale.
function wrap(s: string, scale: number, maxW: number): string[] {
  const maxChars = Math.max(1, Math.floor(maxW / (6 * scale)));
  const words = s.toUpperCase().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? cur + " " + w : w;
    if (cand.length <= maxChars) cur = cand;
    else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawPara(s: string, x: number, y: number, scale: number, maxW: number, c: [number, number, number]): number {
  const lines = wrap(s, scale, maxW);
  lines.forEach((ln, i) => drawText(ln, x, y + i * (7 * scale + 4), scale, c));
  return y + lines.length * (7 * scale + 4);
}

// --- PNG encoder: signature, IHDR, IDAT (zlib), IEND, CRC32 ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- layout ---
const MX = 24; // page margin
const CW = W - 2 * MX; // content width
function main(): void {
  rect(0, 0, W, H, WHITE);
  rect(8, 8, W - 16, H - 16, BLACK); // outer frame
  rect(12, 12, W - 24, H - 24, WHITE);
  // Masthead
  drawCentered("THE WORLD TODAY", W / 2, 34, 5, BLACK);
  hline(MX, 96, CW, BLACK, 3);
  drawCentered("MONDAY 23 NOVEMBER 2026", W / 2, 110, 3, RED);
  hline(MX, 150, CW, BLACK, 3);
  // Lead story
  rect(MX, 168, CW, 168, BLACK);
  drawText("NATO MEETS TODAY", MX + 18, 188, 4, WHITE);
  drawPara(
    "THE NORTH ATLANTIC COUNCIL MEETS IN BRUSSELS TODAY AFTER RUSSIAN MISSILES FELL IN POLAND ON 20 NOVEMBER. ALLIES WEIGH THEIR RESPONSE AS WARSAW DEMANDS ANSWERS.",
    MX + 18, 240, 2, CW - 36, WHITE,
  );
  // Five more stories, one row each
  const stories: [string, string][] = [
    ["COP31 COLLAPSES", "NO DEAL. EU REJECTS DRAFT WITH NO FOSSIL FUELS. LONGEST COP EVER."],
    ["GULF ON EDGE", "IRAN HITS A TANKER AND INDUSTRIAL SITES IN BAHRAIN AS TENSIONS RISE."],
    ["14 MISSING IN KYIV", "A RUSSIAN DRONE STRIKES AN APARTMENT BLOCK. FOURTEEN PEOPLE MISSING."],
    ["CARTEL BOSS CAUGHT", "EL CHAPO ISIDRO IS ARRESTED IN SINALOA AFTER A LONG MANHUNT."],
    ["MYANMAR GUILTY", "A WORLD COURT RULES MYANMAR COMMITTED GENOCIDE AGAINST THE ROHINGYA."],
  ];
  let y = 352;
  for (const [head, body] of stories) {
    hline(MX, y, CW, GREY, 1);
    drawText(head, MX, y + 12, 2, RED);
    drawPara(body, MX, y + 38, 2, CW, BLACK);
    y += 100;
  }
  // Ticker at the bottom
  hline(MX, y + 2, CW, BLACK, 3);
  drawPara(
    "ALSO: MARKETS SLIDE AS AI SELLOFF SPREADS • SPARTA II STILL BURNING IN BALTIC AFTER DRONE STRIKE • INDONESIA FACTORY FIRE: 24 BODY BAGS, 30 MISSING • BEPICOLOMBO REACHES MERCURY AFTER 8 YEARS",
    MX, y + 18, 2, CW, BLACK,
  );
  // Footer: source note fills the bottom of the page.
  hline(MX, 956, CW, BLACK, 3);
  drawCentered("ALL STORIES CHECKED AGAINST REPORTING FROM 21-22 NOVEMBER 2026", W / 2, 972, 2, GREY);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "entry.png"), encodePNG());
}
main();
