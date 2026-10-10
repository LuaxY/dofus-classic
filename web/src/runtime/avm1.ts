// Minimal AVM1 interpreter for the asset SWFs' timeline scripts (docs/runtime.md §2): the 37 opcodes the
// census found plus CallFunction/PushDuplicate. SWF6 semantics: case-insensitive names, undefined → 0 / "".
// AVM1 functions are real JS closures so TS code can call them (`Ground.attach(…)`).
import { DisplayObject, player } from "./object.ts";
import { MovieClip } from "./movieclip.ts";

type Scope = Record<string, unknown>;
type Ctx = {
  target: MovieClip; // base clip: GetProperty(""), goto, play/stop
  self: unknown; // `this`
  chain: object[]; // scope chain, innermost first; last = timeline
  regs: unknown[];
  pool: string[];
  args: unknown[];
};

// ---- SWF6 coercions ---------------------------------------------------------------------------
export const toNum = (v: unknown): number =>
  v === undefined || v === null ? 0 : typeof v === "number" ? v : typeof v === "boolean" ? +v : typeof v === "string" ? (v.trim() === "" ? NaN : Number(v)) : NaN;
export const toStr = (v: unknown): string => (v === undefined ? "" : String(v));
/** SWF ≤ 6: strings convert to booleans through ToNumber. */
export const toBool = (v: unknown): boolean =>
  typeof v === "string" ? !!toNum(v) : typeof v === "number" ? !!v && !Number.isNaN(v) : v !== undefined && v !== null && v !== false;

// ---- case-insensitive members -----------------------------------------------------------------
// ponytail: scans own names + prototype chain on every miss; cache per prototype if profiling shows it.
export function findKey(o: object, name: string): string | undefined {
  if (name in o) return name;
  const l = name.toLowerCase();
  for (let p: object | null = o; p && p !== Object.prototype; p = Object.getPrototypeOf(p))
    for (const k of Object.getOwnPropertyNames(p)) if (k.toLowerCase() === l) return k;
  return undefined;
}
export function getMember(o: unknown, name: string): unknown {
  if (o === undefined || o === null) return undefined;
  const obj = Object(o) as Scope;
  const k = findKey(obj, name);
  return k === undefined ? undefined : obj[k];
}
export function setMember(o: unknown, name: string, v: unknown) {
  if (typeof o !== "object" && typeof o !== "function") return;
  if (o === null) return;
  const obj = o as Scope;
  try {
    obj[findKey(obj, name) ?? name] = v;
  } catch {
    // read-only property (getter only): Flash ignores the write
  }
}

/** Resolve a variable path relative to `base` ("this.plumes3", "_parent.griffes2", "/a/b", "a:b"). */
export function getVar(base: MovieClip, path: string, chain: object[] = [base], self: unknown = base): unknown {
  const colon = path.lastIndexOf(":");
  if (colon >= 0) return getMember(getVar(base, path.slice(0, colon) || "/", chain, self), path.slice(colon + 1));
  if (/[./]/.test(path)) {
    let o: unknown = path.startsWith("/") ? player.root : undefined;
    const parts = path.split(/[./]/).filter((p, i) => p || i > 0);
    parts.forEach((p, i) => {
      if (!p) return;
      o = i === 0 && o === undefined ? getVar(base, p, chain, self) : p === ".." ? getMember(o, "_parent") : getMember(o, p);
    });
    return o;
  }
  const l = path.toLowerCase();
  if (l === "this") return self;
  if (l === "_root" || l === "_level0") return player.root;
  if (l === "_global") return player.global;
  for (const s of chain) {
    const k = findKey(s, path);
    if (k !== undefined) return (s as Scope)[k];
  }
  return getMember(player.global, path);
}
export function setVar(base: MovieClip, path: string, v: unknown, chain: object[] = [base], self: unknown = base) {
  const m = /^(.*)[.:/]([^.:/]+)$/.exec(path);
  if (m) return setMember(getVar(base, m[1] || "/", chain, self), m[2]!, v);
  for (const s of chain) if (findKey(s, path) !== undefined) return setMember(s, path, v);
  setMember(chain[chain.length - 1], path, v);
}

const asTarget = (ctx: Ctx, t: unknown): DisplayObject | undefined =>
  t instanceof DisplayObject ? t : t === "" || t === undefined ? ctx.target : (() => {
    const r = getVar(ctx.target, String(t), ctx.chain, ctx.self);
    return r instanceof DisplayObject ? r : undefined;
  })();

const PROPS = [
  "_x", "_y", "_xscale", "_yscale", "_currentframe", "_totalframes", "_alpha", "_visible", "_width", "_height",
  "_rotation", "_target", "_framesloaded", "_name", "_droptarget", "_url", "_highquality", "_focusrect",
  "_soundbuftime", "_quality", "_xmouse", "_ymouse",
];

function goto(ctx: Ctx, frame: unknown, play: boolean) {
  let clip: DisplayObject | undefined = ctx.target, f = frame;
  if (typeof f === "string" && f.includes(":")) {
    const i = f.lastIndexOf(":");
    clip = asTarget(ctx, f.slice(0, i));
    f = f.slice(i + 1);
  }
  if (!(clip instanceof MovieClip)) return;
  play ? clip.gotoAndPlay(f as number | string) : clip.gotoAndStop(f as number | string);
}

// ---- interpreter ------------------------------------------------------------------------------
const codeCache = new Map<string, Uint8Array>();
const warned = new Set<string>();
export const decode = (b64: string) => {
  let c = codeCache.get(b64);
  if (!c) codeCache.set(b64, (c = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))));
  return c;
};

/** Run a DoAction / clip action / button action body with `this` = `clip`. */
export function runActions(b64: string, clip: MovieClip) {
  const code = decode(b64);
  exec(code, 0, code.length, { target: clip, self: clip, chain: [clip], regs: [], pool: [], args: [] });
}

function cstr(code: Uint8Array, i: number): [string, number] {
  let e = i;
  while (code[e]) e++;
  return [new TextDecoder().decode(code.subarray(i, e)), e + 1];
}

function makeFunction(code: Uint8Array, start: number, size: number, outer: Ctx, params: [reg: number, name: string][], v2?: { regs: number; flags: number }): (...args: unknown[]) => unknown {
  const chain = outer.chain, target = outer.target;
  return function (this: unknown, ...args: unknown[]) {
    const act: Scope = Object.create(null);
    const regs: unknown[] = [];
    if (v2) {
      let r = 1;
      const f = v2.flags;
      if (f & 0x0001) regs[r++] = this; // PreloadThis
      if (f & 0x0004) regs[r++] = args; // PreloadArguments
      if (f & 0x0010) r++; // PreloadSuper (no AS2 classes in assets)
      if (f & 0x0040) regs[r++] = player.root;
      if (f & 0x0080) regs[r++] = target._parent;
      if (f & 0x0100) regs[r++] = player.global;
      if (!(f & 0x0008)) act.arguments = args;
    } else act.arguments = args;
    params.forEach(([reg, name], i) => (reg ? (regs[reg] = args[i]) : (act[name] = args[i])));
    return exec(code, start, start + size, { target, self: this, chain: [act, ...chain], regs, pool: outer.pool, args });
  };
}

function exec(code: Uint8Array, pc: number, end: number, ctx: Ctx): unknown {
  const st: unknown[] = [];
  const dv = new DataView(code.buffer, code.byteOffset, code.byteLength);
  const pop = () => st.pop();
  const popArgs = () => {
    const n = toNum(pop());
    const a: unknown[] = [];
    for (let i = 0; i < n; i++) a.push(pop());
    return a;
  };
  while (pc < end) {
    const op = code[pc++]!;
    if (!op) break;
    let len = 0;
    if (op >= 0x80) (len = dv.getUint16(pc, true)), (pc += 2);
    const at = pc;
    pc += len;
    switch (op) {
      case 0x06: ctx.target.play(); break; // Play
      case 0x07: ctx.target.stop(); break; // Stop
      case 0x0b: { const b = pop(); st.push(toNum(pop()) - toNum(b)); break; } // Subtract
      case 0x0c: st.push(toNum(pop()) * toNum(pop())); break; // Multiply
      case 0x0d: { const b = pop(); st.push(toNum(pop()) / toNum(b)); break; } // Divide
      case 0x12: st.push(!toBool(pop())); break; // Not
      case 0x17: pop(); break; // Pop
      case 0x1c: st.push(getVar(ctx.target, toStr(pop()), ctx.chain, ctx.self)); break; // GetVariable
      case 0x1d: { const v = pop(); setVar(ctx.target, toStr(pop()), v, ctx.chain, ctx.self); break; } // SetVariable
      case 0x22: { const i = toNum(pop()); st.push(getMember(asTarget(ctx, pop()), PROPS[i] ?? "")); break; } // GetProperty
      case 0x23: { const v = pop(), i = toNum(pop()); setMember(asTarget(ctx, pop()), PROPS[i] ?? "", v); break; } // SetProperty
      case 0x25: { const t = asTarget(ctx, pop()); if (t instanceof MovieClip) t.removeMovieClip(); break; } // RemoveSprite
      case 0x26: console.log(toStr(pop())); break; // Trace
      case 0x30: st.push(Math.floor(Math.random() * Math.max(0, toNum(pop())))); break; // RandomNumber
      case 0x3c: { const v = pop(); setMember(ctx.chain[0], toStr(pop()), v); break; } // DefineLocal
      case 0x3d: { const f = getVar(ctx.target, toStr(pop()), ctx.chain, ctx.self), a = popArgs(); st.push(typeof f === "function" ? f.apply(undefined, a) : undefined); break; } // CallFunction
      case 0x3e: return pop(); // Return
      case 0x3f: { const b = pop(); st.push(toNum(pop()) % toNum(b)); break; } // Modulo
      case 0x40: { // NewObject
        const C = getVar(ctx.target, toStr(pop()), ctx.chain, ctx.self), a = popArgs();
        st.push(typeof C === "function" ? Reflect.construct(C, a) : undefined);
        break;
      }
      case 0x47: { // Add2
        const b = pop(), a = pop();
        st.push(typeof a === "string" || typeof b === "string" ? toStr(a) + toStr(b) : toNum(a) + toNum(b));
        break;
      }
      case 0x48: case 0x67: { // Less2, Greater
        let b = pop(), a = pop();
        if (op === 0x67) [a, b] = [b, a];
        if (typeof a === "string" && typeof b === "string") st.push(a < b);
        else {
          const x = toNum(a), y = toNum(b);
          st.push(Number.isNaN(x) || Number.isNaN(y) ? undefined : x < y);
        }
        break;
      }
      case 0x49: { const b = pop(); st.push(pop() == b); break; } // Equals2: ECMA abstract equality (SWF6: undefined == null)
      case 0x4c: st.push(st[st.length - 1]); break; // PushDuplicate
      case 0x4e: { const n = toStr(pop()); st.push(getMember(pop(), n)); break; } // GetMember
      case 0x4f: { const v = pop(), n = toStr(pop()); setMember(pop(), n, v); break; } // SetMember
      case 0x50: st.push(toNum(pop()) + 1); break; // Increment
      case 0x51: st.push(toNum(pop()) - 1); break; // Decrement
      case 0x52: { // CallMethod
        const name = pop(), obj = pop(), a = popArgs();
        const f = name === undefined || name === "" ? obj : getMember(obj, toStr(name));
        st.push(typeof f === "function" ? f.apply(name === undefined || name === "" ? undefined : obj, a) : undefined);
        break;
      }
      case 0x60: st.push(toNum(pop()) & toNum(pop())); break; // BitAnd
      case 0x81: ctx.target.gotoAndStop(dv.getUint16(at, true) + 1); break; // GotoFrame
      case 0x87: ctx.regs[code[at]!] = st[st.length - 1]; break; // StoreRegister
      case 0x88: { // ConstantPool
        ctx.pool = [];
        let i = at + 2;
        for (let n = dv.getUint16(at, true); n > 0; n--) {
          const [s, j] = cstr(code, i);
          ctx.pool.push(s);
          i = j;
        }
        break;
      }
      case 0x8c: ctx.target.gotoAndStop(cstr(code, at)[0]); break; // GoToLabel
      case 0x96: { // Push
        let i = at;
        while (i < at + len) {
          const t = code[i++]!;
          switch (t) {
            case 0: { const [s, j] = cstr(code, i); st.push(s); i = j; break; }
            case 1: st.push(dv.getFloat32(i, true)); i += 4; break;
            case 2: st.push(null); break;
            case 3: st.push(undefined); break;
            case 4: st.push(ctx.regs[code[i++]!]); break;
            case 5: st.push(!!code[i++]); break;
            case 6: { // double: high word first
              const b = new DataView(new ArrayBuffer(8));
              b.setUint32(0, dv.getUint32(i + 4, true), true);
              b.setUint32(4, dv.getUint32(i, true), true);
              st.push(b.getFloat64(0, true));
              i += 8;
              break;
            }
            case 7: st.push(dv.getInt32(i, true)); i += 4; break;
            case 8: st.push(ctx.pool[code[i++]!]); break;
            case 9: st.push(ctx.pool[dv.getUint16(i, true)]); i += 2; break;
          }
        }
        break;
      }
      case 0x99: pc += dv.getInt16(at, true); break; // Jump
      case 0x9d: if (toBool(pop())) pc += dv.getInt16(at, true); break; // If
      case 0x9b: case 0x8e: { // DefineFunction, DefineFunction2
        const [name, i0] = cstr(code, at);
        let i = i0;
        const n = dv.getUint16(i, true);
        i += 2;
        let v2: { regs: number; flags: number } | undefined;
        if (op === 0x8e) (v2 = { regs: code[i]!, flags: code[i + 1]! | (code[i + 2]! << 8) }), (i += 3);
        const params: [number, string][] = [];
        for (let k = 0; k < n; k++) {
          const reg = op === 0x8e ? code[i++]! : 0;
          const [p, j] = cstr(code, i);
          params.push([reg, p]);
          i = j;
        }
        const size = dv.getUint16(i, true);
        const fn = makeFunction(code, pc, size, ctx, params, v2);
        pc += size;
        name ? setMember(ctx.chain[0], name, fn) : st.push(fn);
        break;
      }
      case 0x9f: { // GotoFrame2
        const flags = code[at]!;
        let f = pop();
        if (flags & 2 && typeof f === "number") f += dv.getUint16(at + 1, true);
        goto(ctx, f, !!(flags & 1));
        break;
      }
      default:
        if (!warned.has(String(op))) warned.add(String(op)), console.warn(`avm1: unsupported opcode 0x${op.toString(16)}`);
        return undefined;
    }
  }
  return undefined;
}
