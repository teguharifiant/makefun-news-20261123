// The World Today - 23 November 2026
// Written from scratch in this session. Node 22, stdlib only, no network.
// Draws a deterministic 1024x1024 newspaper front page with a hand-made
// 5x7 bitmap font, then encodes it as a PNG (zlib level 9, filter 0).
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;
const img = new Uint8Array(W * H * 3).fill(255);

function px(x: number, y: number, v: number): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = v; img[i + 1] = v; img[i + 2] = v;
}
function rect(x: number, y: number, w: number, h: number, v: number): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, v);
}
function hline(x: number, y: number, w: number, t: number): void { rect(x, y, w, t, 0); }

// 5x7 bitmap font, "1" = ink. Uppercase, digits and punctuation only.
const F: Record<string, string[]> = {
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  C: ["01110","10001","10000","10000","10000","10001","01110"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  F: ["11111","10000","10000","11110","10000","10000","10000"],
  G: ["01110","10001","10000","10111","10001","10001","01111"],
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  I: ["01110","00100","00100","00100","00100","00100","01110"],
  J: ["00111","00010","00010","00010","00010","10010","01100"],
  K: ["10001","10010","10100","11000","10100","10010","10001"],
  L: ["10000","10000","10000","10000","10000","10000","11111"],
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  P: ["11110","10001","10001","11110","10000","10000","10000"],
  Q: ["01110","10001","10001","10001","10101","10010","01101"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  S: ["01111","10000","10000","01110","00001","00001","11110"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  U: ["10001","10001","10001","10001","10001","10001","01110"],
  V: ["10001","10001","10001","10001","10001","01010","00100"],
  W: ["10001","10001","10001","10101","10101","11011","10001"],
  X: ["10001","10001","01010","00100","01010","10001","10001"],
  Y: ["10001","10001","01010","00100","00100","00100","00100"],
  Z: ["11111","00001","00010","00100","01000","10000","11111"],
  "0": ["01110","10001","10011","10101","11001","10001","01110"],
  "1": ["00100","01100","00100","00100","00100","00100","01110"],
  "2": ["01110","10001","00001","00110","01000","10000","11111"],
  "3": ["11111","00010","00100","00010","00001","10001","01110"],
  "4": ["00010","00110","01010","10010","11111","00010","00010"],
  "5": ["11111","10000","11110","00001","00001","10001","01110"],
  "6": ["01110","10000","10000","11110","10001","10001","01110"],
  "7": ["11111","00001","00010","00100","01000","01000","01000"],
  "8": ["01110","10001","10001","01110","10001","10001","01110"],
  "9": ["01110","10001","10001","01111","00001","00001","01110"],
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
  ".": ["00000","00000","00000","00000","00000","01100","01100"],
  ",": ["00000","00000","00000","00000","01100","00100","01000"],
  ":": ["00000","01100","01100","00000","01100","01100","00000"],
  "-": ["00000","00000","00000","01110","00000","00000","00000"],
  "'": ["00100","00100","01000","00000","00000","00000","00000"],
  '"': ["01010","01010","00000","00000","00000","00000","00000"],
  "(": ["00010","00100","01000","01000","01000","00100","00010"],
  ")": ["01000","00100","00010","00010","00010","00100","01000"],
  "/": ["00001","00010","00010","00100","01000","01000","10000"],
  "•": ["00000","00100","01110","01110","01110","00100","00000"],
  "%": ["11001","11010","00010","00100","01000","01011","10011"],
  "!": ["00100","00100","00100","00100","00100","00000","00100"],
};

function drawChar(ch: string, x: number, y: number, s: number, v: number): void {
  const g = F[ch] || F[" "];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
    if (g[r][c] === "1") rect(x + c * s, y + r * s, s, s, v);
  }
}
function textW(t: string, s: number): number { return t.length * 6 * s - s; }
function drawText(t: string, x: number, y: number, s: number, v = 0): void {
  for (let i = 0; i < t.length; i++) drawChar(t[i], x + i * 6 * s, y, s, v);
}
function drawCentred(t: string, y: number, s: number): void {
  drawText(t, Math.floor((W - textW(t, s)) / 2), y, s);
}
function wrap(t: string, maxW: number, s: number): string[] {
  const per = Math.max(1, Math.floor(maxW / (6 * s)));
  const words = t.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length <= per) cur = next;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawPara(t: string, x: number, y: number, maxW: number, s: number, lh: number, v = 0): number {
  const lines = wrap(t, maxW, s);
  lines.forEach((ln, i) => drawText(ln, x, y + i * lh, s, v));
  return y + lines.length * lh;
}

const MX = 36;                 // margin
const CW = W - MX * 2;         // content width = 952
let y = 34;
drawCentred("THE WORLD TODAY", y, 8); y += 62;
drawCentred("MONDAY 23 NOVEMBER 2026", y, 3); y += 30;
hline(MX, y, CW, 4); y += 18;

// Lead
drawText("NATO MEETS TODAY", MX, y, 4); y += 36;
y = drawPara(
  "NORTH ATLANTIC COUNCIL MEETS IN BRUSSELS TODAY, 23 NOVEMBER, AFTER RUSSIAN KH-101 MISSILES AND A DRONE FELL IN POLAND ON 20 NOVEMBER. POLAND IS REPRESENTED BY DEPUTY DEFENCE MINISTER PAWEL ZALEWSKI. SECRETARY GENERAL RUTTE: WILL DEFEND EVERY INCH OF POLISH TERRITORY. NO OUTCOME YET.",
  MX, y, CW, 2, 19);
y += 14; hline(MX, y, CW, 2); y += 16;

// COP31
drawText("COP31 COLLAPSES", MX, y, 3); y += 28;
y = drawPara(
  "NO DEAL. EU REJECTS DRAFT WITH NO FOSSIL FUELS. LONGEST COP EVER. THE LONGEST COP IN HISTORY, AND THE FIRST BIG FAILURE SINCE COP15 IN 2009. THE UNITED STATES WAS ABSENT.",
  MX, y, CW, 2, 19);
y += 16; hline(MX, y, CW, 1); y += 16;

// Gulf
drawText("GULF ON EDGE", MX, y, 3); y += 28;
y = drawPara("IRAN ATTACKED A TANKER AND INDUSTRIAL SITES IN BAHRAIN.", MX, y, CW, 2, 19);
y += 16; hline(MX, y, CW, 1); y += 16;

// Kyiv
drawText("14 MISSING IN KYIV", MX, y, 3); y += 28;
y = drawPara("A RUSSIAN DRONE HIT AN APARTMENT BLOCK, 14 PEOPLE MISSING.", MX, y, CW, 2, 19);
y += 16; hline(MX, y, CW, 1); y += 16;

// Cartel
drawText("CARTEL BOSS CAUGHT", MX, y, 3); y += 28;
y = drawPara('"EL CHAPO ISIDRO" WAS CAUGHT IN SINALOA, 11 PEOPLE KILLED.', MX, y, CW, 2, 19);
y += 16; hline(MX, y, CW, 1); y += 16;

// Myanmar
drawText("MYANMAR GUILTY", MX, y, 3); y += 28;
y = drawPara("THE ICJ RULED MYANMAR COMMITTED GENOCIDE AGAINST THE ROHINGYA.", MX, y, CW, 2, 19);
y += 38;

// Ticker box: black background, white text.
const boxY = y;
rect(MX, boxY, CW, 128, 0);
y = boxY + 16;
y = drawPara(
  "ALSO: MARKETS SLIDE AS AI SELLOFF SPREADS \u2022 SPARTA II STILL BURNING IN BALTIC AFTER DRONE STRIKE \u2022 INDONESIA FACTORY FIRE: 24 BODY BAGS, 30 MISSING \u2022 BEPICOLOMBO REACHES MERCURY AFTER 8 YEARS",
  MX + 18, y, CW - 36, 2, 19, 255);
y = boxY + 142;
drawCentred("SOURCES: REUTERS, CNN, LE MONDE, NPR, EU TODAY, PAP", y, 1);

// PNG encode, deterministic: no ancillary chunks, no timestamps.
function crc32(buf: Buffer): number {
  let table = (crc32 as any).t;
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    (crc32 as any).t = table;
  }
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const raw = Buffer.alloc(H * (1 + W * 3));
for (let r = 0; r < H; r++) {
  raw[r * (1 + W * 3)] = 0;
  raw.set(img.subarray(r * W * 3, (r + 1) * W * 3), r * (1 + W * 3) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "output";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "output.png"), png);
console.log("wrote", path.join(outDir, "output.png"), png.length, "bytes");
