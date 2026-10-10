import { expect, test } from "bun:test";
import { cryptPassword } from "./crypt.ts";

// Vectors hand-traced through __Packages/ank/Crypt.as (HASH: a-z = 0..25, A-Z = 26..51, 0-9 = 52..61, "-", "_").
test("cryptPassword: padding to a multiple of 8 happens once (\"ab\" → \"abab\")", () => {
  // pass 1: a^A = 32 → G, b^A = 35 → J → "GJGJ"; pass 2 reversed: J^A = 11 → l, G^A = 6 → g
  expect(cryptPassword("ab", "A".repeat(32))).toBe("lglg");
  expect(cryptPassword("a", "A".repeat(32))).toBe("gg"); // "a" → "aa"
  expect(cryptPassword("", "A".repeat(32))).toBe("");
});

test("cryptPassword: 8 chars, varying key (second pass uses key[(i + 8) % 32])", () => {
  // pass 1: t^a=21 v, e^b=7 h, s^c=16 q, t^d=16 q, 1^e=84%64=20 u, 2^f=20 u, 3^g=20 u, 4^h=92%64=28 C → "vhqquuuC"
  // pass 2: C^i=42 Q, u^j=31 F, u^k=30 E, u^l=25 z, q^m=28 C, q^n=31 F, h^o=7 h, v^p=6 g
  expect(cryptPassword("test1234", "abcdefghijklmnopqrstuvwxyzABCDEF")).toBe("QFEzCFhg");
});
