// Port of __Packages/ank/PatternDecoder.as (class ank.PatternDecoder), used by DataCenter.Item names and
// descriptions. Works on a char array mutated in place with the original index arithmetic: the loop bound
// `len` is fixed at entry while the array shrinks/grows, exactly as in the AS.
//   getDescription: "#n" → params[n-1] (removed if undefined), "~n" → cut the rest if params[n-1] is undefined,
//                   "{…}" → recursive block.
//   combine:        "~k" → cut the rest unless flag k (m/f/n gender, p plural, s singular) is set, "{…}" block.
import { str, toNumber } from "./swf6.ts";

type Chars = unknown[];

const isNaNSwf6 = (v: unknown): boolean => Number.isNaN(toNumber(v)); // isNaN(undefined) is false in SWF 6

/** PatternDecoder.as:6-12 */
export function getDescription(s: string | undefined, params: readonly unknown[]): string {
  if (s === undefined) return ""; // AS: undefined.split → undefined … → "" once concatenated
  return join(decodeDescription(s.split(""), params));
}

/** PatternDecoder.as:13-25 */
export function combine(s: string | undefined, gender: string | undefined, singular: unknown): string {
  if (s === undefined) return "";
  const flags: Record<string, unknown> = { m: gender == "m", f: gender == "f", n: gender == "n", p: !singular, s: singular };
  return join(decodeCombine(s.split(""), flags));
}

const join = (a: Chars): string => a.map(str).join("");

/** PatternDecoder.as:26-74 */
function decodeDescription(a: Chars, params: readonly unknown[]): Chars {
  let i = 0;
  const len = a.length;
  while (i < len) {
    switch (a[i]) {
      case "#": {
        const n = a[i + 1];
        if (!isNaNSwf6(n)) {
          if (params[toNumber(n) - 1] != undefined) {
            a.splice(i, 2, params[toNumber(n) - 1]);
            i -= 1;
          } else {
            a.splice(i, 2);
            i -= 2;
          }
        }
        break;
      }
      case "~": {
        const n = a[i + 1];
        if (!isNaNSwf6(n)) {
          if (params[toNumber(n) - 1] == undefined) return a.slice(0, i);
          a.splice(i, 2);
          i -= 2;
        }
        break;
      }
      case "{": {
        const k = find(a.slice(i), "}");
        const r = join(decodeDescription(a.slice(i + 1, i + k), params));
        a.splice(i, k + 1, r);
      }
    }
    i++;
  }
  return a;
}

/** PatternDecoder.as:75-104. Flag keys are looked up case-insensitively (SWF 6), so "~M" tests `m`. */
function decodeCombine(a: Chars, flags: Record<string, unknown>): Chars {
  let i = 0;
  const len = a.length;
  while (i < len) {
    switch (a[i]) {
      case "~": {
        const key = a[i + 1];
        if (!flags[str(key).toLowerCase()]) return a.slice(0, i);
        a.splice(i, 2);
        i -= 2;
        break;
      }
      case "{": {
        const k = find(a.slice(i), "}");
        const r = join(decodeCombine(a.slice(i + 1, i + k), flags));
        a.splice(i, k + 1, r);
      }
    }
    i++;
  }
  return a;
}

/** PatternDecoder.as:105-120 */
function find(a: Chars, f: string): number {
  for (let i = 0; i < a.length; i++) if (a[i] == f) return i;
  return -1;
}
