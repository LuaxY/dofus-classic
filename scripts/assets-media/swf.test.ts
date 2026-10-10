import { expect, test } from "bun:test";
import { T, charId, exportsOf, readEditText, readFont2, readSwf, readText } from "./swf.ts";

const load = async (p: string) => readSwf(new Uint8Array(await Bun.file(import.meta.dir + "/../../dofus-5b/" + p).arrayBuffer()));

test("circle.swf: exports and sprite frames", async () => {
  const swf = await load("clips/circle.swf");
  expect([...exportsOf(swf)]).toEqual([[2, "Mc_SelectionAnimate"]]);
  const sprite5 = swf.tags.find((t) => t.code === T.DefineSprite && charId(t) === 5)!;
  expect(sprite5.data[2]).toBe(6);
  expect(swf.tags.filter((t) => t.sprite === 5 && t.code === T.ShowFrame).length).toBe(6);
});

test("texts decode through the font code tables (UTF-8, accents, curly quote)", async () => {
  const aks = await load("AKSClient.swf");
  const aksFonts = new Map(aks.tags.filter((t) => t.code === T.DefineFont2).map(readFont2).map((f) => [f.id, f]));
  expect(readText(aks.tags.find((t) => t.code === T.DefineText)!, aksFonts).records.map((r) => r.text)).toEqual(["DataCenter"]);
  expect(aksFonts.get(1)).toMatchObject({ name: "bitMini6", bold: false });
  expect(aksFonts.get(1)!.codes.length).toBe(1108);

  const g2 = await load("clips/guilds/descriptions/2.swf");
  const fonts = new Map(g2.tags.filter((t) => t.code === T.DefineFont2).map(readFont2).map((f) => [f.id, f]));
  const t2 = readText(g2.tags.find((t) => t.code === T.DefineText && charId(t) === 2)!, fonts);
  expect(t2.records[0]!.text).toBe("Le Cri de l’ours permet de retirer des PA à plusieurs cibles dans un ");

  const ui = await load("modules/Interfaces.swf");
  const edit = readEditText(ui.tags.find((t) => t.code === T.DefineEditText && charId(t) === 497)!);
  expect(edit).toMatchObject({ variable: "xp", text: "200", font: 3, height: 10, align: "center" });
});
