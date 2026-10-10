import { expect, test } from "bun:test";
import { getCCText, getGuildText, getItemSuperTypeText, getMapText, getText, setLangData } from "./lang.ts";
import { combine, getDescription } from "./patternDecoder.ts";

test("getText substitutes %1..%n sequentially like StringExtensions.replace", () => {
  setLangData({ A: "%1 vs %2", B: "x%10", C: "%1%2", D: "plain" });
  expect(getText("A", ["Bob", 3])).toBe("Bob vs 3");
  expect(getText("B", ["y"])).toBe("xy0"); // "%10" is hit by the "%1" pass
  expect(getText("C", ["%2", "!"])).toBe("!!"); // text inserted by pass 1 is replaced by pass 2
  expect(getText("A", [undefined, null])).toBe(" vs null"); // SWF 6: undefined → ""
  expect(getText("D")).toBe("plain");
  expect(getText("MISSING", ["a"])).toBeUndefined();
});

test("lookup fallbacks", () => {
  setLangData({ CC: { "1": "cc1" }, M: { "507": { n: "Room", d: "" } }, I: { st: { "1": "" } } });
  expect(getCCText(1)).toBe("cc1");
  expect(getCCText(2)).toBe("?");
  expect(getMapText("507").n).toBe("Room");
  expect(getMapText(1)).toEqual({ n: "?", d: "?" });
  expect(getGuildText(undefined)).toEqual({ sn: "?", ln: "?", d: "?", cc: "?" });
  expect(getItemSuperTypeText(1)).toBe("?"); // empty string → "?"
  expect(getItemSuperTypeText(2)).toBeUndefined(); // missing → undefined (AS `undefined.length != 0`)
});

test("PatternDecoder.getDescription", () => {
  expect(getDescription("Dommages #1{~2 à }#2", [3, 7])).toBe("Dommages 3 à 7");
  expect(getDescription("Dommages #1{~2 à }#2", [3, undefined])).toBe("Dommages 3");
  expect(getDescription("a~1b", [])).toBe("a"); // "~n" with undefined param cuts the rest
  expect(getDescription("end#", [])).toBe("end"); // "#" + undefined: isNaN(undefined) is false in SWF 6 → removed
  expect(getDescription("#x", [1])).toBe("#x");
  // Interfaces CC tooltip pattern (modules_Interfaces DefineButton2_970): "#1{~1D}#2{~2~3+}#3"
  expect(getDescription("#1{~1D}#2{~2~3+}#3", [2, 6, 4])).toBe("2D6+4");
});

test("PatternDecoder.combine", () => {
  expect(combine("pierre{~p s}", "f", true)).toBe("pierre");
  expect(combine("pierre{~p s}", "f", false)).toBe("pierre s");
  expect(combine("bon{~fne}", "f", true)).toBe("bonne");
  expect(combine("bon{~Mx}", "m", true)).toBe("bonx"); // SWF 6: flag lookup is case-insensitive
});
