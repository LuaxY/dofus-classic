// Headless check of the UI shell: Interfaces.swf loaded the way Kernel does, INTERFACE created by the root script,
// boxes / list / combo / tooltip rendered and driven by injected mouse events. PNGs: web/public/assets/port-preview/ui/.
import { beforeAll, expect, test } from "bun:test";
import { isolateGlobals } from "../testGlobals.ts";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, GlobalFonts, loadImage, Path2D } from "@napi-rs/canvas";
import { setLangData } from "../../core/lang.ts";
import { MovieClip, Player, type ScriptHook } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { FComboBoxClass, FListBoxClass, FPushButtonClass, FScrollBarClass } from "./controls.ts";
import { Interface } from "./interface.ts";
import { scripts } from "./scripts.ts";
import type { WindowBox } from "./windows.ts";

(globalThis as { Path2D?: unknown }).Path2D ??= Path2D;
const ROOT = join(import.meta.dir, "../../../..");
const SWF = join(ROOT, "web/public/assets/swf"), PREVIEW = join(ROOT, "web/public/assets/port-preview/ui");
mkdirSync(PREVIEW, { recursive: true });
for (const f of ["Verdana-c2158db2.ttf", "Verdana-bold-a1ed6d4e.ttf", "bitMini6-477eb65d.ttf"]) GlobalFonts.registerFromPath(join(ROOT, "web/public/assets/media/fonts", f));
// authored test strings (the lang data is lost; tests do not depend on them, they only make the previews readable)
setLangData({ INFORMATIONS: "Informations", QUESTION: "Question", CLOSE: "Fermer", YES: "Oui", NO: "Non", GO_TO_FIGHTS: "Aller aux combats" });

isolateGlobals();
let p: Player;
const hook: ScriptHook = (k) => scripts[k];
const tick = (n = 1) => { for (let i = 0; i < n; i++) p.advance(40); };
/** Stage centre of a display object. */
const centre = (o: MovieClip) => {
  const b = o.getBounds(p.root);
  return { x: (b.xMin + b.xMax) / 2, y: (b.yMin + b.yMax) / 2 };
};
const click = (o: MovieClip) => {
  const c = centre(o);
  p.mouseMove(c.x, c.y);
  p.mouseDown();
  p.mouseUp();
};
const png = (name: string) => {
  const c = createCanvas(742, 550), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  p.render(ctx);
  writeFileSync(join(PREVIEW, name), c.toBuffer("image/png"));
};

beforeAll(async () => {
  p = new Player({
    loader: { json: async (f) => JSON.parse(readFileSync(join(SWF, f), "utf8")), image: async (f) => (await loadImage(join(SWF, f))) as unknown as CanvasImageSource },
    createCanvas: (w, h) => createCanvas(w, h),
    scriptHook: hook,
  });
  p.root.$replaceContent(await p.load("AKSClient.swf"));
  const ui = p.root.createEmptyMovieClip("Interfaces", 3); // AKSClient/Dofus.Kernel.as:13-14
  ui.loadMovie("modules/Interfaces.swf");
  for (let i = 0; i < 100 && !ui.$.loaded; i++) await new Promise((r) => setTimeout(r, 10)), p.tick();
  tick(2);
  // preview backdrop standing in for a screen (the components are drawn for the blue Dofus panels)
  const bg = G.INTERFACE.CommonLayer_mc.createEmptyMovieClip("previewBackdrop", 0);
  bg.beginGradientFill("linear", [0x1070c7, 0x39a8e0, 0x6dc5e9], [100, 100, 100], [0, 98, 255], { matrixType: "box", x: 0, y: 0, w: 742, h: 550, r: Math.PI / 2 });
  bg.moveTo(0, 0), bg.lineTo(742, 0), bg.lineTo(742, 550), bg.lineTo(0, 550), bg.lineTo(0, 0);
  bg.endFill();
});

test("root script creates INTERFACE with its layers", () => {
  const I = G.INTERFACE;
  expect(I).toBeInstanceOf(Interface);
  expect(String(I)).toBe("_level0.Interfaces.interfaceClip");
  expect(I.CommonLayer_mc.getDepth()).toBe(10);
  expect(I.MainLayer_mc.waiting).toBeDefined();
  expect(I.Text).toBe(I.MainLayer_mc.Text);
  expect(I.MainLayer_mc.waiting._currentframe).toBe(1); // stop() on frame 1 (scripts.ts #733@1)
  I.MainLayer_mc.waiting.open();
  tick(3);
  expect(I.MainLayer_mc.waiting._currentframe).toBe(3); // plays `open`, stops on 3
  I.MainLayer_mc.waiting.close();
  tick(3);
  expect(I.MainLayer_mc.waiting._currentframe).toBe(1);
});

test("msgBox: window around boxMessage, close button removes it", () => {
  const I = G.INTERFACE;
  I.msgBox("Connexion <b>impossible</b> au serveur.");
  tick(2);
  const box = I.BoxLayer_mc.boxMessage as WindowBox;
  expect(box).toBeDefined();
  const content = box.window_mc!.main_mc.container_mc as MovieClip & { close_btn: FPushButtonClass };
  expect(content.message_txt).toBeDefined();
  const btn = content.close_btn;
  expect(btn._xscale).toBe(80); // load handler
  expect(btn.getLabel()).toBe("Fermer");
  expect(box.window_mc!._x).toBeGreaterThan(100); // centred on the stage
  p.mouseMove(20, 500); // outside the window: the WindowBox's full-stage clip (#144@1:1:rollOver) takes the mouse
  expect(p.target()?._parent).toBe(box);
  png("msgbox.png");
  click(btn);
  expect(I.BoxLayer_mc.boxMessage).toBeUndefined();
});

test("questionBox: rollOver highlights, Yes calls onQuestionBoxYes and closes", () => {
  const I = G.INTERFACE;
  let yes = 0, no = 0;
  I.onQuestionBoxYes = () => yes++;
  I.onQuestionBoxNo = () => no++;
  I.questionBox("Voulez-vous vraiment quitter la partie ?");
  tick(2);
  const content = I.BoxLayer_mc.boxYesNo!.window_mc!.main_mc.container_mc as MovieClip & { yes_btn: FPushButtonClass; no_btn: FPushButtonClass };
  const c = centre(content.yes_btn);
  p.mouseMove(c.x, c.y);
  expect(content.yes_btn.fpbState_mc._currentframe).toBe(2); // over
  p.mouseDown();
  expect(content.yes_btn.fpbState_mc._currentframe).toBe(3); // down
  png("yesno.png");
  p.mouseUp();
  expect(yes).toBe(1);
  expect(no).toBe(0);
  expect(I.BoxLayer_mc.boxYesNo).toBeUndefined();
  p.mouseMove(0, 0);
});

test("ListBox: items, internal scroll bar, selection (first click only arms it), double click, scrolling", () => {
  const I = G.INTERFACE;
  const host = I.CommonLayer_mc.createEmptyMovieClip("test", 50);
  host._x = 40;
  host._y = 60;
  const lb = host.attachMovie("Ank::Dofus::ListBox", "lst", 1, { itemSymbol: "FListItemSymbol", hideBoundingBox: true }) as FListBoxClass;
  lb.setSize(200, 120);
  I.listBox_sf.addListener(lb); // as every Dofus list's load handler
  I.listBox_sf.applyChanges();
  const people = ["Nergal", "MamieCasseCou", "NergalVita", "LaPtitFee", "Nergal-Rebellion", "Strip", "Joker", "upehCramac", "Pyra", "Cixi", "Bouftou", "Tofu"];
  for (const n of people) lb.addItem({ name: n }, n); // object items: stored and mutated (`data`)
  lb.addItem("texte libre", 99);
  tick(3);
  expect(lb.getLength()).toBe(13);
  expect(lb.numDisplayed).toBeGreaterThan(3);
  expect(lb.scrollBar_mc).toBeDefined();
  expect(lb.dataProvider.items[0]!.data).toBe("Nergal");
  // `_width = _height = 0` on the hidden scrollBarAsset (#237@1:1:load) goes through the runtime's scaling, not the AS setSize
  expect(((lb.superClassAsset as MovieClip).scrollBarAsset as MovieClip)._xscale).toBe(0);
  const row = (i: number) => lb.container_mc["fListItem" + i + "_mc"] as MovieClip & { fLabel_mc: { labelField: { text: string } } };
  expect(row(0).fLabel_mc.labelField.text).toBe("Nergal, Nergal"); // no `label`: values joined (data, name)
  p.advance(1000);
  click(row(1).highlight_mc as MovieClip);
  expect(lb.getSelectedIndex()).toBeUndefined(); // clickFilter: first selectionHandler call only arms it
  let changes = 0, dbl = 0;
  lb.setChangeHandler("onLst", { onLst: () => changes++ });
  lb.onDblClick = () => dbl++;
  click(row(1).highlight_mc as MovieClip);
  expect(lb.getSelectedIndex()).toBe(1);
  expect(lb.getValue()).toBe("MamieCasseCou");
  expect(changes).toBe(1);
  click(row(1).highlight_mc as MovieClip); // < 400 ms later
  expect(dbl).toBe(1);
  tick(2);
  png("listbox.png");
  const sb = lb.scrollBar_mc as unknown as FScrollBarClass;
  click(sb.downArrow_mc);
  tick(2);
  expect(lb.topDisplayed).toBe(1);
  expect(row(0).fLabel_mc.labelField.text).toBe("MamieCasseCou, MamieCasseCou");
  host.removeMovieClip();
});

test("ComboBox: popup opens on press, rollOver + release selects and fires the change handler", () => {
  const I = G.INTERFACE;
  const host = I.CommonLayer_mc.createEmptyMovieClip("test", 50);
  host._x = 300;
  host._y = 80;
  const cb = host.attachMovie("Ank::Dofus::ComboBox", "combo", 1, { labels: ["1 vs 1", "2 vs 2", "3 vs 3", "4 vs 4"], data: ["AA", "BB", "CC", "DD"], editable: false, rowCount: 8 }) as FComboBoxClass;
  cb.setSize(140);
  tick(3);
  expect(cb.getLength()).toBe(4);
  expect(cb.getSelectedIndex()).toBe(0);
  expect(cb.superHolder._parent).toBe(host); // _root (AKSClient) cannot attach FBoundingBoxSymbol → popup in the parent
  let changed: unknown;
  cb.setChangeHandler("onCombo", { onCombo: (c: FComboBoxClass) => (changed = c.getValue()) });
  const top = centre(cb);
  p.advance(1000);
  p.mouseMove(top.x, top.y);
  p.mouseDown(); // first press only focuses (clickFilter), second opens
  p.mouseUp();
  p.mouseDown();
  p.mouseUp();
  expect(cb.opened).toBe(true);
  expect(cb.container_mc._visible).toBe(true);
  tick(2);
  const item = cb.container_mc["fListItem2_mc"] as MovieClip;
  const c = centre(item.highlight_mc as MovieClip);
  p.mouseMove(c.x, c.y); // rollOver selects the row (FComboBoxItemSymbol)
  tick(1);
  png("combobox.png");
  p.mouseDown();
  p.mouseUp();
  expect(cb.getSelectedIndex()).toBe(2);
  expect(changed).toBe("CC");
  expect(cb.opened).toBe(false);
  host.removeMovieClip();
  p.mouseMove(0, 0);
});

test("tooltip: appears after 300 ms, hideToolTip removes it", () => {
  const I = G.INTERFACE;
  I.drawToolTip("Sort : <b>Flèche magique</b><br>3 PA", 300, 300);
  const tt = I.MainLayer_mc.tooltip!;
  expect(tt._visible).toBe(false);
  p.advance(400);
  tick(1);
  expect(tt._visible).toBe(true);
  expect(tt._width).toBeGreaterThan(20);
  png("tooltip.png");
  I.hideToolTip();
  expect(I.MainLayer_mc.tooltip).toBeUndefined();
});

test("Interface.Text: setTextTimer shows centred text and clears itself", () => {
  const I = G.INTERFACE;
  I.Text.setTextTimer("Au tour de Nergal", 2000, true, true);
  tick(8);
  expect(I.Text.txtZone).toBeDefined();
  png("text.png");
  p.advance(2100);
  expect(I.Text.txtZone).toBeUndefined();
});

test("ScrollBar on a TextField: thumb follows maxscroll, arrows scroll the field, text changes resync", () => {
  const host = G.INTERFACE.CommonLayer_mc.createEmptyMovieClip("test", 50);
  host._x = 450;
  host._y = 300;
  const txt = host.createTextField("txt", 1, 0, 0, 180, 60);
  Object.assign(txt, { multiline: true, wordWrap: true });
  txt.text = Array.from({ length: 12 }, (_, i) => "ligne " + i).join("\n");
  const sb = host.attachMovie("Ank::Dofus::ScrollBar", "sb", 2, { _targetInstanceName: "txt", horizontal: false, thumbPointer: true }) as FScrollBarClass;
  sb._x = 182;
  sb.setSize(60);
  tick(2);
  expect(sb.maxPos).toBe(txt.maxscroll);
  expect(sb.scrollThumb_mc).toBeDefined();
  click(sb.downArrow_mc);
  expect(txt.scroll).toBe(2);
  txt.text += "\nencore\nencore";
  p.advance(60); // watch → 50 ms resync
  expect(sb.maxPos).toBe(txt.maxscroll);
  png("scrollbar-text.png");
  host.removeMovieClip();
  p.mouseMove(0, 0);
});

test("optionsBox: gauges and mute buttons read and write SOMA", () => {
  const calls: string[] = [];
  const g = G as unknown as Record<string, unknown>;
  g.SOMA = {
    getVolumeMusic: () => 50, setVolumeMusic: (v: number) => calls.push("music " + v), getVolumeSound: () => 100, setVolumeSound: (v: number) => calls.push("sound " + v),
    getMuteMusic: () => false, setMuteMusic: (b: boolean) => calls.push("muteMusic " + b), getMuteSound: () => true, setMuteSound: (b: boolean) => calls.push("muteSound " + b),
  };
  G.INTERFACE.optionsBox();
  tick(2);
  const c = G.INTERFACE.BoxLayer_mc.boxOptions!.window_mc!.main_mc.container_mc as MovieClip & Record<string, MovieClip & Record<string, unknown>>;
  expect(c.muteSounds_btn!.bSelected).toBe(true);
  expect(c.muteMusic_btn!.bSelected).toBe(false);
  click(c.muteMusic_btn!);
  expect(calls).toContain("muteMusic true");
  const gauges = c.$.children.filter((k) => k.$.id === 903) as (MovieClip & { Markers: MovieClip })[];
  expect(gauges.length).toBe(2);
  click(gauges[0]!.Markers.marker5 as MovieClip);
  expect(calls).toContain("music 25");
  png("options.png");
  delete g.SOMA;
  G.INTERFACE.BoxLayer_mc.boxOptions!.hide();
});

test("menuBox / wisperBox: hard-coded labels, KERNEL calls, Enter sends once (leaked Key listener is inert)", () => {
  const calls: string[] = [];
  const g = G as unknown as Record<string, unknown>;
  g.KERNEL = { KeyListener: { setEnabled: (b: boolean) => calls.push("keys " + b) }, quit: () => calls.push("quit") };
  g.AKS = { Chat: { send: (t: string, to: string) => calls.push(`send ${t} > ${to}`) } };
  G.INTERFACE.menuBox();
  tick(2);
  const m = G.INTERFACE.BoxLayer_mc.boxMenu!.window_mc!.main_mc.container_mc as MovieClip & Record<string, FPushButtonClass>;
  expect(m.quit_btn!.getLabel()).toBe("Changer de perso");
  expect(m.giveup_btn!._visible).toBe(false); // no DATACENTER: Game.isRunning falsy
  png("menu.png");
  expect(m.lobby_btn).toBeUndefined(); // the authored entry is only offered on the village map
  click(m.quit_btn!);
  expect(calls).toEqual(["quit", "keys true"]);
  // on the shared village map (Game.state 1): "Aller aux combats" in the slot of the hidden "Abandonner", sends GX
  g.DATACENTER = { Game: { state: 1, isRunning: false } };
  (g.AKS as Record<string, unknown>).send = (d: string, w: boolean) => calls.push(`raw ${JSON.stringify(d)} ${w}`);
  G.INTERFACE.menuBox();
  tick(2);
  const v = G.INTERFACE.BoxLayer_mc.boxMenu!.window_mc!.main_mc.container_mc as MovieClip & Record<string, FPushButtonClass>;
  expect(v.lobby_btn!.getLabel()).toBe("Aller aux combats");
  expect([v.lobby_btn!._x, v.lobby_btn!._y, v.lobby_btn!._xscale]).toEqual([v.giveup_btn!._x, v.giveup_btn!._y, v.quit_btn!._xscale]);
  expect(Math.round(v.lobby_btn!._width)).toBe(Math.round(v.quit_btn!._width));
  png("menu-village.png");
  click(v.lobby_btn!);
  expect(calls.slice(-2)).toEqual(['raw "GX\\n" false', "keys true"]);
  expect(G.INTERFACE.BoxLayer_mc.boxMenu).toBeUndefined();
  delete g.DATACENTER;
  G.INTERFACE.wisperBox("Nergal");
  tick(2);
  const w = G.INTERFACE.BoxLayer_mc.boxWhisper!.window_mc!.main_mc.container_mc as MovieClip & { txtZone: { text: string } };
  expect(calls.at(-1)).toBe("keys false");
  w.txtZone.text = "salut";
  png("whisper.png");
  p.keyDown(13, 13);
  p.keyUp(13, 13);
  expect(G.INTERFACE.BoxLayer_mc.boxWhisper).toBeUndefined();
  p.keyDown(13, 13);
  p.keyUp(13, 13);
  expect(calls.filter((c) => c.startsWith("send"))).toEqual(["send salut > Nergal"]);
  delete g.KERNEL;
  delete g.AKS;
});

test("setCursor / setSpellCursor / progress bar / login substitute hook", async () => {
  const I = G.INTERFACE;
  const cur = I.setCursor("clips/helpicon.swf")!;
  expect(I.getCursor()).toBe(cur);
  expect(cur.forbidden).toBeDefined();
  cur.setForbidden(false);
  expect(cur.forbidden).toBeUndefined();
  I.setSpellCursor({ iconFile: "clips/spells/icons/1.swf", m_ID: 1 });
  expect(I.getSpellCursor()?.data.m_ID).toBe(1);
  I.clear(); // removes cursor + spell cursor, keeps the data for the drop target
  expect(I.getCursor()).toBeUndefined();
  expect(I.lastSpellcursorData?.m_ID).toBe(1);
  I.lastSpellcursorData = null;
  I.setSpellCursor(null); // the removed clip resolves to nothing: no stale data comes back
  expect(I.lastSpellcursorData).toBeUndefined();
  I.showProgressBar("Chargement");
  I.updateProgressBar(50, 100);
  expect(I.MainLayer_mc.progressBar!.bar.front.front._width).toBe(75);
  png("progressbar.png");
  I.hideProgressBar();
  const { loginSubstitute } = await import("./interface.ts");
  let built: MovieClip | undefined;
  const registered = loginSubstitute.draw; // B2's login.ts registration, shared with the other test files
  loginSubstitute.draw = (c) => (built = c);
  I.drawLoginInterface();
  expect(built).toBe(I.CommonLayer_mc.loginInterface);
  expect(typeof built!.onLogin).toBe("function");
  loginSubstitute.draw = registered;
  I.clear();
  expect(I.CommonLayer_mc.loginInterface).toBeUndefined();
});

test("ColorPicker, ank PushButton radio group (ColorDrip), CheckBox", async () => {
  const { ColorPicker, PushButton } = await import("./ank.ts");
  const { Interface_CheckBox } = await import("./widgets.ts");
  const host = G.INTERFACE.CommonLayer_mc.createEmptyMovieClip("test", 50);
  host._x = 60;
  host._y = 320;
  const cp = host.attachMovie("ank::components::ColorPicker", "picker", 1) as InstanceType<typeof ColorPicker>;
  expect(cp).toBeInstanceOf(ColorPicker);
  const picked: number[] = [];
  cp.addListener({ onColorSelect: (c: number) => picked.push(c) });
  const g = cp.colors.getBounds(p.root);
  p.mouseMove(g.xMin + 1, g.yMin + 1); // top-left of the hue gradient: pure red, no grey
  p.mouseDown();
  p.mouseUp();
  expect(picked.length).toBe(1);
  expect(picked[0]! >> 16).toBeGreaterThan(0xf0); // ≈ red: hue stop 0 is 0xFF0000
  expect(picked[0]! & 0xffff).toBeLessThan(0x1000);
  const a = host.attachMovie("ColorDrip", "c1", 2, { _x: 200 }) as InstanceType<typeof PushButton>;
  const b = host.attachMovie("ColorDrip", "c2", 3, { _x: 240 }) as InstanceType<typeof PushButton>;
  a.groupWith(b);
  b.groupWith(a);
  let selected: unknown;
  b.addListener({ onSelect: (btn: unknown) => (selected = btn) });
  a.select(true, true);
  click(b);
  expect(selected).toBe(b);
  expect(b.selected).toBe(true);
  expect(a.selected).toBe(false);
  b.setColor(0x00ff00);
  const ck = host.attachMovie("Interface::CheckBox", "ck", 4, { _x: 300, bgColor: 0xc6ecff }) as InstanceType<typeof Interface_CheckBox>;
  let clicks = 0;
  ck.onClick = () => clicks++;
  ck.setEnabled(true);
  ck.setToolTip("Messages");
  click(ck);
  expect(clicks).toBe(1);
  expect(G.INTERFACE.MainLayer_mc.tooltip).toBeDefined(); // rollOver tooltip
  tick(10);
  png("widgets.png");
  host.removeMovieClip();
  G.INTERFACE.hideToolTip();
});
