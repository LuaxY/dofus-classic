// TextField (DefineEditText / createTextField) with the Flash 6 HTML subset, word wrap, scrolling and
// autoSize, drawn with canvas fillText using the original font names (web/public/assets/media/fonts.css).
// Input fields are edited through a DOM overlay managed by the player (docs/runtime.md §4.5).
import type { ColorTransform, EditTextSymbol, Matrix, Rect } from "../swf/types.ts";
import { css, dom, resolve, xform, type LoadedSwf } from "../swf/render.ts";
import { setVar } from "./avm1.ts";
import { call, DisplayObject, player, type Internal } from "./object.ts";

type Align = "left" | "right" | "center" | "justify";
export type Fmt = {
  font: string; size: number; color: number; bold: boolean; italic: boolean; underline: boolean; align: Align;
  leftMargin: number; rightMargin: number; indent: number; leading: number; url: string;
};
type Run = { text: string; fmt: Fmt };
type Seg = { text: string; fmt: Fmt; x: number; w: number };
type Line = { segs: Seg[]; width: number; ascent: number; descent: number; leading: number; align: Align; first: boolean };
type Layout = { key: string; lines: Line[]; textWidth: number; textHeight: number };

export type TextInternal = Internal & {
  rect: Rect;
  runs: Run[];
  src?: string; // htmlText as last assigned
  html: boolean;
  fmt: Fmt; // new text format
  textAlpha: number; // DefineEditText colour alpha (TextFormat.color is RGB): 51 for the banner slot numbers (Interfaces 771)
  scroll: number;
  hscroll: number;
  autoSize: "none" | "left" | "center" | "right";
  variable?: string;
  layout?: Layout;
  editing?: boolean; // DOM overlay shows the text
  listeners: object[]; // TextField.addListener
};

/** `new TextFormat()`: every field null = "leave unchanged" in setTextFormat. */
export class TextFormat {
  font: string | null = null; size: number | null = null; color: number | null = null; bold: boolean | null = null;
  italic: boolean | null = null; underline: boolean | null = null; align: Align | null = null; leftMargin: number | null = null;
  rightMargin: number | null = null; indent: number | null = null; leading: number | null = null; url: string | null = null;
  target: string | null = null; bullet: boolean | null = null; tabStops: number[] | null = null;
  constructor(font?: string, size?: number, color?: number, bold?: boolean, italic?: boolean, underline?: boolean, url?: string, target?: string, align?: Align, leftMargin?: number, rightMargin?: number, indent?: number, leading?: number) {
    Object.assign(this, Object.fromEntries(Object.entries({ font, size, color, bold, italic, underline, url, target, align, leftMargin, rightMargin, indent, leading }).filter(([, v]) => v !== undefined)));
  }
}
const FMT_KEYS = ["font", "size", "color", "bold", "italic", "underline", "align", "leftMargin", "rightMargin", "indent", "leading", "url"] as const;

const DEFAULT: Fmt = { font: "Times New Roman", size: 12, color: 0, bold: false, italic: false, underline: false, align: "left", leftMargin: 0, rightMargin: 0, indent: 0, leading: 0, url: "" };

// ---- fonts --------------------------------------------------------------------------------------
type FontInfo = { family: string; bold: boolean; italic: boolean; ascent: number; descent: number };
const GENERIC: Record<string, string> = { _sans: "sans-serif", _serif: "serif", _typewriter: "monospace", "times new roman": "serif" };
const fontCache = new Map<string, FontInfo>();
/** A TextFormat font name: an exported font linkage (`Font2` → Verdana bold) or a font/device name. */
function fontInfo(name: string, swf?: LoadedSwf): FontInfo {
  const key = `${swf?.file.src}|${name}`;
  let f = fontCache.get(key);
  if (f) return f;
  f = { family: name, bold: false, italic: false, ascent: 0.9, descent: 0.22 };
  for (const s of [swf, ...player.loadedSwfs()]) {
    const id = s?.file.exports[name];
    const sym = id !== undefined ? s!.file.symbols[id] : undefined;
    if (sym?.type === "font") {
      f = fromSymbol(sym);
      break;
    }
  }
  fontCache.set(key, f);
  return f;
}
const fromSymbol = (s: { name: string; bold: boolean; italic: boolean; ascent?: number; descent?: number }): FontInfo => ({
  family: s.name, bold: s.bold, italic: s.italic, ascent: (s.ascent ?? 922) / 1024, descent: (s.descent ?? 225) / 1024,
});
const cssFont = (f: Fmt, info: FontInfo) =>
  `${f.italic || info.italic ? "italic " : ""}${f.bold || info.bold ? "bold " : ""}${f.size}px "${info.family}", ${GENERIC[info.family.toLowerCase()] ?? "sans-serif"}`;

// ---- HTML (Flash 6 subset: p, br, font, b, i, u, a, li, textformat) ----------------------------------
const ENT: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'", nbsp: " " };
const unescape = (s: string) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) =>
  e[0] === "#" ? String.fromCharCode(e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENT[e.toLowerCase()] ?? m));
export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function parseHtml(src: string, base: Fmt): Run[] {
  const runs: Run[] = [], stack: Fmt[] = [base];
  const top = () => stack[stack.length - 1]!;
  const push = (text: string) => text && runs.push({ text, fmt: top() });
  const re = /<(\/?)([a-zA-Z]+)([^>]*)>|([^<]+)/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m[4] !== undefined) {
      push(unescape(m[4]));
      continue;
    }
    const close = !!m[1], tag = m[2]!.toLowerCase(), attrs: Record<string, string> = {};
    for (const a of m[3]!.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g)) attrs[a[1]!.toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? "";
    if (tag === "br") push("\r");
    else if (close) {
      if (tag === "p" || tag === "li") push("\r");
      if (["p", "li", "font", "b", "i", "u", "a", "textformat"].includes(tag) && stack.length > 1) stack.pop();
    } else {
      const f = { ...top() };
      if (tag === "p" && attrs.align) f.align = attrs.align.toLowerCase() as Align;
      if (tag === "font") {
        if (attrs.face) f.font = attrs.face;
        if (attrs.size && !Number.isNaN(Number(attrs.size))) f.size = Number(attrs.size);
        if (attrs.color) f.color = parseInt(attrs.color.replace("#", ""), 16);
      }
      if (tag === "b") f.bold = true;
      if (tag === "i") f.italic = true;
      if (tag === "u") f.underline = true;
      if (tag === "a") f.url = attrs.href ?? "";
      if (tag === "textformat") {
        for (const k of ["leftmargin", "rightmargin", "indent", "leading"] as const)
          if (attrs[k] !== undefined) f[k === "leftmargin" ? "leftMargin" : k === "rightmargin" ? "rightMargin" : k] = Number(attrs[k]);
      }
      if (["p", "li", "font", "b", "i", "u", "a", "textformat"].includes(tag)) stack.push(f);
      if (tag === "li") push("• ");
    }
  }
  if (runs.length && runs[runs.length - 1]!.text === "\r") runs.pop(); // last paragraph end is not a line
  return runs;
}

// ---- TextField ----------------------------------------------------------------------------------
export class TextField extends DisplayObject<TextInternal> {
  type: "dynamic" | "input" = "dynamic";
  wordWrap = false;
  multiline = false;
  selectable = true;
  password = false;
  maxChars: number | null = null;
  restrict: string | null = null;
  border = false;
  borderColor = 0;
  background = false;
  backgroundColor = 0xffffff;
  embedFonts = false;
  condenseWhite = false;
  declare onChanged?: (tf: TextField) => void;
  declare onSetFocus?: (old: unknown) => void;
  declare onKillFocus?: (next: unknown) => void;
  declare onScroller?: (tf: TextField) => void;

  constructor(p: Partial<Internal>, sym?: EditTextSymbol) {
    const font = sym?.font !== undefined && p.swf ? resolve(p.swf, sym.font)?.[1] : undefined;
    const fmt: Fmt = !sym ? { ...DEFAULT } : {
      ...DEFAULT, font: font?.type === "font" ? font.name : DEFAULT.font, size: sym.size ?? 12,
      color: sym.color ? (sym.color[0] << 16) | (sym.color[1] << 8) | sym.color[2] : 0, align: sym.align ?? "left",
      leftMargin: sym.leftMargin ?? 0, rightMargin: sym.rightMargin ?? 0, indent: sym.indent ?? 0, leading: sym.leading ?? 0,
      bold: font?.type === "font" && font.bold, italic: font?.type === "font" && font.italic,
    };
    super({ ...p, rect: sym?.bounds ?? [0, 0, 100, 100], runs: [], html: !!sym?.html, fmt, textAlpha: sym?.color?.[3] ?? 255, scroll: 1, listeners: [], hscroll: 0, autoSize: sym?.autoSize ? "left" : "none" });
    if (sym) {
      this.type = sym.readOnly ? "dynamic" : "input";
      Object.assign(this, { wordWrap: sym.wordWrap, multiline: sym.multiline, selectable: sym.selectable, password: sym.password, border: sym.border, embedFonts: sym.useOutlines });
      if (sym.maxLength) this.maxChars = sym.maxLength;
      if (sym.text) sym.html ? (this.htmlText = sym.text) : (this.text = sym.text);
      if (sym.variable) this.variable = sym.variable;
    }
  }

  // ---- content ----------------------------------------------------------------------------------
  get text(): string { return this.$.runs.map((r) => r.text).join(""); }
  set text(v: string) {
    this.$.runs = [{ text: v === undefined ? "" : String(v), fmt: this.$.fmt }];
    this.$.src = undefined;
    this.$changed();
  }
  get htmlText(): string { return this.$.html ? (this.$.src ?? escapeHtml(this.text)) : this.text; }
  set htmlText(v: string) {
    if (!this.$.html) {
      this.text = v;
      return;
    }
    this.$.src = v === undefined ? "" : String(v);
    this.$.runs = parseHtml(this.$.src, this.$.fmt);
    this.$changed();
  }
  get html(): boolean { return this.$.html; }
  set html(v: boolean) { this.$.html = !!v; }
  get length(): number { return this.text.length; }
  get variable(): string | undefined { return this.$.variable; }
  set variable(v: string | undefined) {
    this.$.variable = v || undefined;
    v ? player.bound.add(this) : player.bound.delete(this);
  }
  get textColor(): number { return this.$.runs[0]?.fmt.color ?? this.$.fmt.color; }
  set textColor(v: number) {
    this.$.fmt = { ...this.$.fmt, color: Number(v) };
    this.$.runs = this.$.runs.map((r) => ({ ...r, fmt: { ...r.fmt, color: Number(v) } }));
  }
  get autoSize(): string { return this.$.autoSize; }
  set autoSize(v: string | boolean) {
    const s = String(v).toLowerCase();
    this.$.autoSize = v === true || s === "true" ? "left" : s === "left" || s === "center" || s === "right" ? s : "none";
  }
  /** After a content change: the bound variable (Flash writes it back, `txtChat` ↔ `chatContent`) and the DOM editor. */
  private $changed() {
    const p = this.$.parent, name = this.$.variable;
    if (p && name) setVar(p, name, this.$.html ? this.htmlText : this.text);
    if (this.$.editing) player.editorText(this);
  }
  /** `addListener(o)`: `o` receives onChanged / onScroller with the field, after the field itself (its own listener). */
  addListener(o: object) {
    if (!this.$.listeners.includes(o)) this.$.listeners.push(o);
    return true;
  }
  removeListener(o: object) {
    const i = this.$.listeners.indexOf(o);
    if (i >= 0) this.$.listeners.splice(i, 1);
    return i >= 0;
  }
  /** A field event (onChanged: user edit, onScroller: scroll change) to the field and its listeners. */
  $broadcast(ev: "onChanged" | "onScroller") {
    for (const o of [this, ...this.$.listeners]) call(o, ev, this);
  }

  // ---- formats ----------------------------------------------------------------------------------
  getTextFormat(): TextFormat {
    const t = new TextFormat(), runs = this.$.runs.length ? this.$.runs : [{ text: "", fmt: this.$.fmt }];
    for (const k of FMT_KEYS) {
      const v = runs[0]!.fmt[k];
      if (runs.every((r) => r.fmt[k] === v)) (t as unknown as Record<string, unknown>)[k] = v;
    }
    return t;
  }
  getNewTextFormat(): TextFormat {
    return Object.assign(new TextFormat(), this.$.fmt);
  }
  setNewTextFormat(f: TextFormat) {
    this.$.fmt = merge(this.$.fmt, f);
  }
  /** `(fmt)`, `(index, fmt)` or `(begin, end, fmt)`. */
  setTextFormat(a: TextFormat | number, b?: TextFormat | number, c?: TextFormat) {
    const f = a instanceof TextFormat ? a : b instanceof TextFormat ? b : c;
    if (!f) return;
    const begin = typeof a === "number" ? a : 0, end = typeof b === "number" ? b : typeof a === "number" ? a + 1 : Infinity;
    const out: Run[] = [];
    let pos = 0;
    for (const r of this.$.runs) {
      const s = Math.max(begin - pos, 0), e = Math.min(end - pos, r.text.length);
      if (s >= e) out.push(r);
      else {
        if (s > 0) out.push({ text: r.text.slice(0, s), fmt: r.fmt });
        out.push({ text: r.text.slice(s, e), fmt: merge(r.fmt, f) });
        if (e < r.text.length) out.push({ text: r.text.slice(e), fmt: r.fmt });
      }
      pos += r.text.length;
    }
    this.$.runs = out;
  }
  /** CSS font of the first run (linkages such as `Font2` resolved), for the DOM editor. */
  $cssFont(): string {
    const f = this.$.runs[0]?.fmt ?? this.$.fmt;
    return cssFont(f, fontInfo(f.font, this.$.swf));
  }
  removeTextField() {
    if (this.$.depth >= 0) this.$remove();
  }
  $unload() {
    super.$unload();
    player.bound.delete(this);
  }

  // ---- AKSClient prototype extensions -----------------------------------------------------------------
  /** `AKSClient/TextField.setText.as` */
  setText(text: unknown, font?: string, color?: number, size?: number) {
    const f = this.getTextFormat();
    f.font = font !== undefined ? font : "Font2";
    if (color !== undefined) f.color = color;
    if (size !== undefined) f.size = size;
    this.text = text as string;
    this.setTextFormat(f);
    this.embedFonts = true;
  }
  /** `AKSClient/TextField.setHtmlText.as` */
  setHtmlText(text: string, font?: string) {
    const f = this.getTextFormat();
    f.font = font !== undefined ? font : "Font2";
    this.html = true;
    this.htmlText = text;
    this.setTextFormat(f);
    this.embedFonts = true;
  }
  /** `AKSClient/TextField.initChat.as`: pad with newlines until the field scrolls. */
  initChat() {
    this.text = "";
    while (this.maxscroll === 1) this.text += "\n";
  }

  // ---- layout -----------------------------------------------------------------------------------
  private $layout(): Layout {
    const $ = this.$, [x0, , x1] = $.rect;
    const key = JSON.stringify([$.runs, x1 - x0, this.wordWrap, this.password, $.autoSize]);
    if ($.layout?.key === key) return $.layout;
    const ctx = player.scratch, avail = (f: Fmt) => x1 - x0 - 4 - f.leftMargin - f.rightMargin;
    const measure = (t: string, f: Fmt) => {
      ctx.font = cssFont(f, fontInfo(f.font, $.swf));
      return ctx.measureText(t).width;
    };
    const lines: Line[] = [];
    let line: Line | undefined;
    const newLine = (f: Fmt, first: boolean) => lines.push((line = { segs: [], width: 0, ascent: 0, descent: 0, leading: f.leading, align: f.align, first }));
    const metrics = (f: Fmt) => {
      const i = fontInfo(f.font, $.swf);
      line!.ascent = Math.max(line!.ascent, i.ascent * f.size);
      line!.descent = Math.max(line!.descent, i.descent * f.size);
      line!.leading = Math.max(line!.leading, f.leading);
    };
    newLine($.runs[0]?.fmt ?? $.fmt, true);
    metrics($.runs[0]?.fmt ?? $.fmt);
    for (const r of $.runs) {
      const text = this.password ? r.text.replace(/[^\r\n]/g, "*") : r.text;
      for (const [i, para] of text.split(/\r\n|\r|\n/).entries()) {
        if (i > 0) newLine(r.fmt, true), metrics(r.fmt);
        for (const word of this.wordWrap ? para.match(/\S*\s*/g)!.filter(Boolean) : para ? [para] : []) {
          const w = measure(word, r.fmt), indent = line!.first ? r.fmt.indent : 0;
          if (this.wordWrap && line!.segs.length && line!.width + measure(word.trimEnd(), r.fmt) > avail(r.fmt) - indent) newLine(r.fmt, false), metrics(r.fmt);
          const last = line!.segs[line!.segs.length - 1];
          if (last && last.fmt === r.fmt) (last.text += word), (last.w += w);
          else line!.segs.push({ text: word, fmt: r.fmt, x: line!.width, w });
          line!.width += w;
          metrics(r.fmt);
        }
      }
    }
    const textWidth = Math.max(0, ...lines.map((l) => l.width)), textHeight = lines.reduce((h, l) => h + l.ascent + l.descent + l.leading, 0);
    $.layout = { key, lines, textWidth, textHeight };
    if ($.autoSize !== "none") {
      const r = $.rect, h = textHeight + 4;
      if (!this.wordWrap) {
        const w = textWidth + 4, dx = $.autoSize === "center" ? (r[2] - r[0] - w) / 2 : $.autoSize === "right" ? r[2] - r[0] - w : 0;
        $.rect = [r[0] + dx, r[1], r[0] + dx + w, r[1] + h];
      } else $.rect = [r[0], r[1], r[2], r[1] + h];
      $.layout.key = JSON.stringify([$.runs, $.rect[2] - $.rect[0], this.wordWrap, this.password, $.autoSize]);
    }
    return $.layout;
  }
  private $visibleLines(from: number): number {
    const { lines } = this.$layout(), h = this.$.rect[3] - this.$.rect[1] - 4;
    let y = 0, n = 0;
    for (let i = from; i < lines.length; i++) {
      const l = lines[i]!;
      y += l.ascent + l.descent + l.leading;
      if (y > h && n > 0) break;
      if (y > h) return 0;
      n++;
    }
    return n;
  }
  get textWidth(): number { return this.$layout().textWidth; }
  get textHeight(): number { return this.$layout().textHeight; }
  get maxscroll(): number {
    const n = this.$layout().lines.length;
    for (let s = 1; s <= n; s++) if (s + this.$visibleLines(s - 1) - 1 >= n) return s;
    return Math.max(1, n);
  }
  /** A content change keeps the stored scroll; it is clamped when read. `Chat.refresh` (`AKSClient/Dofus.Chat.as:94-105`)
   *  empties the log (`initChat`) and refills it, then follows the bottom only if `scroll` is within 4 of `maxscroll`;
   *  `Ank.Dofus.ScrollBar.as:371-374` reads `Math.min(scroll, maxscroll)` after a text change. The 2004 screenshots show
   *  the chat at its newest line. (Ruffle resets scroll to 1 on every relayout, which would leave the chat at the top.) */
  get scroll(): number {
    const s = this.$.scroll;
    return s > 1 ? Math.min(s, this.maxscroll) : 1;
  }
  set scroll(v: number) {
    const s = Math.max(1, Math.min(this.maxscroll, Math.floor(Number(v)) || 1)), old = this.scroll;
    this.$.scroll = s;
    if (s !== old) this.$broadcast("onScroller");
  }
  get bottomScroll(): number { return this.scroll + Math.max(1, this.$visibleLines(this.scroll - 1)) - 1; }
  get hscroll(): number { return this.$.hscroll; }
  set hscroll(v: number) { this.$.hscroll = Math.max(0, Math.min(this.maxhscroll, Number(v) || 0)); }
  get maxhscroll(): number { return Math.max(0, Math.ceil(this.$layout().textWidth - (this.$.rect[2] - this.$.rect[0] - 4))); }

  // TextField _width/_height resize the field (Flash), they do not scale it
  protected $setSize(axis: 0 | 1, v: number) {
    if (Number.isNaN(v)) return;
    const r = [...this.$.rect] as Rect;
    r[axis + 2] = r[axis]! + v;
    this.$.rect = r;
  }

  // ---- DisplayObject ----------------------------------------------------------------------------
  $draw(ctx: CanvasRenderingContext2D, cx: ColorTransform) {
    const { lines } = this.$layout(), [x0, y0, x1, y1] = this.$.rect;
    const rgb = (c: number, a = 255): [number, number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255, a];
    if (this.background) (ctx.fillStyle = css(rgb(this.backgroundColor), cx)), ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (this.border) {
      const m = ctx.getTransform();
      ctx.strokeStyle = css(rgb(this.borderColor), cx);
      ctx.lineWidth = 1 / (Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1);
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }
    if (this.$.editing) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, x1 - x0, y1 - y0);
    ctx.clip();
    ctx.textBaseline = "alphabetic";
    let y = y0 + 2;
    for (let i = this.scroll - 1; i < lines.length && y < y1; i++) {
      const l = lines[i]!, f0 = l.segs[0]?.fmt ?? this.$.fmt;
      const room = x1 - x0 - 4 - f0.leftMargin - f0.rightMargin - (l.first ? f0.indent : 0);
      const x = x0 + 2 + f0.leftMargin + (l.first ? f0.indent : 0) - this.$.hscroll + (l.align === "center" ? (room - l.width) / 2 : l.align === "right" ? room - l.width : 0);
      for (const s of l.segs) {
        ctx.font = cssFont(s.fmt, fontInfo(s.fmt.font, this.$.swf));
        ctx.fillStyle = css(rgb(s.fmt.color, this.$.textAlpha), cx);
        ctx.fillText(s.text, x + s.x, y + l.ascent);
        if (s.fmt.underline) ctx.fillRect(x + s.x, y + l.ascent + 1, s.w, Math.max(1, s.fmt.size / 16));
      }
      y += l.ascent + l.descent + l.leading;
    }
    ctx.restore();
  }
  $bounds(m: Matrix): Rect | null {
    this.$layout();
    return xform(this.$.rect, m);
  }
  $hitLocal(x: number, y: number): boolean {
    this.$layout();
    const r = this.$.rect;
    return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
  }
  $fills(out: Path2D, m: Matrix) {
    const r = this.$.rect, q = new Path2D();
    q.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
    out.addPath(q, dom(m));
  }
}

function merge(f: Fmt, t: TextFormat): Fmt {
  const o = { ...f } as Record<string, unknown>;
  for (const k of FMT_KEYS) if (t[k] !== null && t[k] !== undefined) o[k] = k === "align" ? String(t[k]).toLowerCase() : t[k];
  return o as Fmt;
}
