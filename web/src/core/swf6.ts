// AVM1 coercions for SWF version 6 (AKSClient.swf header byte = 6). These differ from JS and from SWF 7+:
// - ToNumber(undefined) is 0 (SWF 7+: NaN), so `undefined + 1 === 1`, `undefined - x === -x`.
// - ToString(undefined) is "" (SWF 7+: "undefined"), so `"CJ" + undefined === "CJ"`.
// Also SWF 6 identifiers/member names are case-insensitive (`lowxp` reads `lowXp`, `BATTLEFIELD.MAP` is
// `BATTLEFIELD.Map`); the ports resolve those spellings to one field and say so where it matters.
// String→number edge cases (whitespace, leading-zero octal) are left to JS `Number` — UNKNOWN if they differ.

/** SWF 6 ToNumber: undefined → 0, everything else like JS `Number`. */
export const toNumber = (v: unknown): number => (v === undefined ? 0 : Number(v));

/** SWF 6 ToString: undefined → "", everything else like JS (null → "null"). */
export const str = (v: unknown): string => (v === undefined ? "" : String(v));
