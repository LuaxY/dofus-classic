// Minimal SWF (Flash 6) tag reader: just enough to index media tags and decode texts.
// Pixel decoding (JPEG/zlib bitmaps, MP3, font outlines) is left to JPEXS (tools/ffdec.sh).
import { inflateSync } from "node:zlib";

export type Tag = { code: number; data: Uint8Array; sprite: number; frame: number };
export type Swf = { version: number; frameCount: number; tags: Tag[] };
export type Rect = { xMin: number; yMin: number; xMax: number; yMax: number };

export const T = {
  ShowFrame: 1, DefineShape: 2, DefineBits: 6, JPEGTables: 8, DefineText: 11, DefineSound: 14,
  StartSound: 15, SoundStreamBlock: 19, DefineBitsLossless: 20, DefineBitsJPEG2: 21,
  DefineShape2: 22, DefineShape3: 32, DefineText2: 33, DefineButton2: 34, DefineBitsJPEG3: 35,
  DefineBitsLossless2: 36, DefineEditText: 37, DefineSprite: 39, SoundStreamHead: 18,
  SoundStreamHead2: 45, DefineMorphShape: 46, DefineFont2: 48, ExportAssets: 56,
} as const;
export const TAG_NAME: Record<number, string> = Object.fromEntries(Object.entries(T).map(([k, v]) => [v, k]));

export class Reader {
  pos = 0;
  private bit = 0; // bits already consumed in data[pos] when bit-reading
  constructor(readonly data: Uint8Array) {}
  u8() { this.align(); return this.data[this.pos++]!; }
  u16() { return this.u8() | (this.u8() << 8); }
  s16() { const v = this.u16(); return v >= 0x8000 ? v - 0x10000 : v; }
  u32() { return (this.u16() | (this.u16() << 16)) >>> 0; }
  bytes(n: number) { this.align(); const b = this.data.subarray(this.pos, this.pos + n); this.pos += n; return b; }
  cstr() {
    this.align();
    const end = this.data.indexOf(0, this.pos);
    const s = new TextDecoder().decode(this.data.subarray(this.pos, end < 0 ? this.data.length : end));
    this.pos = end < 0 ? this.data.length : end + 1;
    return s;
  }
  ub(n: number) {
    let v = 0;
    for (let i = 0; i < n; i++) {
      v = (v << 1) | ((this.data[this.pos]! >> (7 - this.bit)) & 1);
      if (++this.bit === 8) { this.bit = 0; this.pos++; }
    }
    return v >>> 0;
  }
  sb(n: number) { const v = this.ub(n); return n && v & (1 << (n - 1)) ? v - 2 ** n : v; }
  align() { if (this.bit) { this.bit = 0; this.pos++; } }
  rect(): Rect {
    const n = this.ub(5);
    const r = { xMin: this.sb(n), xMax: this.sb(n), yMin: this.sb(n), yMax: this.sb(n) };
    this.align();
    return r;
  }
  matrix() {
    const m = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
    if (this.ub(1)) { const n = this.ub(5); m.a = this.sb(n) / 65536; m.d = this.sb(n) / 65536; }
    if (this.ub(1)) { const n = this.ub(5); m.b = this.sb(n) / 65536; m.c = this.sb(n) / 65536; }
    const n = this.ub(5); m.tx = this.sb(n); m.ty = this.sb(n);
    this.align();
    return m;
  }
}

export function readSwf(file: Uint8Array): Swf {
  const sig = String.fromCharCode(file[0]!, file[1]!, file[2]!);
  if (sig !== "FWS" && sig !== "CWS") throw new Error(`not a SWF (${sig})`);
  const body = sig === "CWS" ? new Uint8Array(inflateSync(file.subarray(8))) : file.subarray(8);
  const r = new Reader(body);
  r.rect();
  r.u16(); // frame rate (8.8)
  const frameCount = r.u16();
  const tags: Tag[] = [];
  walk(body, r.pos, body.length, 0, tags);
  return { version: file[3]!, frameCount, tags };
}

function walk(data: Uint8Array, pos: number, end: number, sprite: number, out: Tag[]) {
  let frame = 0;
  while (pos + 2 <= end) {
    const h = data[pos]! | (data[pos + 1]! << 8);
    pos += 2;
    let len = h & 63;
    if (len === 63) { len = new DataView(data.buffer, data.byteOffset + pos, 4).getUint32(0, true); pos += 4; }
    const code = h >> 6;
    const tagData = data.subarray(pos, pos + len);
    if (code === 0) return;
    out.push({ code, data: tagData, sprite, frame });
    if (code === T.ShowFrame) frame++;
    if (code === T.DefineSprite) walk(data, pos + 4, pos + len, tagData[0]! | (tagData[1]! << 8), out);
    pos += len;
  }
}

export const charId = (t: Tag) => t.data[0]! | (t.data[1]! << 8);

/** ExportAssets linkage names: characterId -> name (first wins, like the Flash player). */
export function exportsOf(swf: Swf) {
  const m = new Map<number, string>();
  for (const t of swf.tags) {
    if (t.code !== T.ExportAssets) continue;
    const r = new Reader(t.data);
    for (let n = r.u16(); n > 0; n--) { const id = r.u16(); const name = r.cstr(); if (!m.has(id)) m.set(id, name); }
  }
  return m;
}

export type Font = { id: number; name: string; bold: boolean; italic: boolean; codes: number[] };
export function readFont2(t: Tag): Font {
  const r = new Reader(t.data);
  const id = r.u16();
  const flags = r.u8();
  r.u8(); // language code
  const name = new TextDecoder().decode(r.bytes(r.u8())).replace(/\0+$/, "");
  const numGlyphs = r.u16();
  const wideOffsets = (flags & 0x08) !== 0;
  const tableStart = r.pos;
  let codeTableOffset = 0;
  if (numGlyphs) {
    r.pos += numGlyphs * (wideOffsets ? 4 : 2);
    codeTableOffset = wideOffsets ? r.u32() : r.u16();
  }
  r.pos = tableStart + codeTableOffset;
  const codes = Array.from({ length: numGlyphs }, () => (flags & 0x04 ? r.u16() : r.u8()));
  return { id, name, bold: (flags & 1) !== 0, italic: (flags & 2) !== 0, codes };
}

export type TextRecord = { font?: number; height?: number; color?: string; x?: number; y?: number; text: string };
/** DefineText/DefineText2; glyph indices are mapped through the font code tables of the same SWF. */
export function readText(t: Tag, fonts: Map<number, Font>) {
  const r = new Reader(t.data);
  const id = r.u16();
  const bounds = r.rect();
  r.matrix();
  const glyphBits = r.u8();
  const advanceBits = r.u8();
  const records: TextRecord[] = [];
  let font: Font | undefined;
  for (let flags = r.u8(); flags !== 0; flags = r.u8()) {
    const rec: TextRecord = { text: "" };
    if (flags & 0x08) { rec.font = r.u16(); font = fonts.get(rec.font); }
    if (flags & 0x04) rec.color = hex(r.bytes(t.code === T.DefineText2 ? 4 : 3));
    if (flags & 0x01) rec.x = r.s16() / 20;
    if (flags & 0x02) rec.y = r.s16() / 20;
    if (flags & 0x08) rec.height = r.u16() / 20;
    const count = r.u8();
    for (let i = 0; i < count; i++) {
      const g = r.ub(glyphBits);
      r.sb(advanceBits);
      const code = font?.codes[g];
      rec.text += code === undefined ? "�" : String.fromCharCode(code);
    }
    r.align();
    records.push(rec);
  }
  return { id, bounds: px(bounds), records };
}

export function readEditText(t: Tag) {
  const r = new Reader(t.data);
  const id = r.u16();
  const bounds = px(r.rect());
  const f1 = r.u8();
  const f2 = r.u8();
  const out: Record<string, unknown> = { id, bounds };
  if (f1 & 0x01) { out.font = r.u16(); out.height = r.u16() / 20; }
  if (f1 & 0x04) out.color = hex(r.bytes(4));
  if (f1 & 0x02) out.maxLength = r.u16();
  if (f2 & 0x20) {
    out.align = ["left", "right", "center", "justify"][r.u8()] ?? "left";
    out.leftMargin = r.u16() / 20; out.rightMargin = r.u16() / 20; out.indent = r.u16() / 20; out.leading = r.s16() / 20;
  }
  out.variable = r.cstr();
  out.text = f1 & 0x80 ? r.cstr() : "";
  const flagNames: [number, number, string][] = [
    [f1, 0x40, "wordWrap"], [f1, 0x20, "multiline"], [f1, 0x10, "password"], [f1, 0x08, "readOnly"],
    [f2, 0x40, "autoSize"], [f2, 0x10, "noSelect"], [f2, 0x08, "border"], [f2, 0x02, "html"], [f2, 0x01, "useOutlines"],
  ];
  out.flags = flagNames.filter(([b, m]) => b & m).map(([, , n]) => n);
  return out as { id: number; text: string; variable: string; font?: number; flags: string[] } & Record<string, unknown>;
}

const hex = (b: Uint8Array) => "#" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const px = (r: Rect): Rect => ({ xMin: r.xMin / 20, yMin: r.yMin / 20, xMax: r.xMax / 20, yMax: r.yMax / 20 });
