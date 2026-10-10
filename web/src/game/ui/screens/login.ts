// Login substitute — provenance `authored` (written for this port, NOT beta content).
// The beta's login UI, `files/login/swf/DofusLoginInterface.swf`, was downloaded at run time from jouer.dofus.com and
// is lost (docs/logic/ui.md §2.1). `INTERFACE.drawLoginInterface` (B1, web/src/game/ui/interface.ts) creates
// `CommonLayer_mc.loginInterface`, installs its `onLogin(login, password)` (sets DATACENTER.Player.login/password,
// `AKS.connect(SERVER_NAME, SERVER_PORT)`) and calls `loginSubstitute.draw(container)` instead of `loadMovie(url)`.
// What the kernel needs from the content (decompiled/clean/):
//   - the content calls `onLogin(login, password)` on the container (Dofus.Interface.as:70-78);
//   - Enter in a TextField named `txtName` or `txtPass` logs in, reading `eval(sel)._parent.txtName/txtPass.text`
//     (AKSClient/Dofus.KeyListener.as:93-98): both fields are siblings, direct children of the container;
//   - errors are shown by AKSClient with `INTERFACE.msgBox` (AKSClient/Events.AKS.as:9-14, 62-67).
// Layout and `setTextError` follow the June-2004 `AnimUILoginSymbol` of vendor/wayback-dofus-2004/DofusLogin.swf
// (post-5b, provenance `retro`): account and password tabs over two input fields, an OK button, an error line.
// Graphics: drawing API + the Interfaces.swf PushButton and embedded fonts. Labels use the 5b keys ACCOUNT and PASSWORD;
// the button label "OK" is authored (no 5b key).
import { getText } from "../../../core/lang.ts";
import { MovieClip, Selection, TextField, TextFormat } from "../../../runtime/player.ts";
import { loginSubstitute } from "../interface.ts";
import type { PushButton } from "./as.ts";

export type LoginInterface = MovieClip & {
  onLogin: (login: string, password: string) => void;
  txtName: TextField;
  txtPass: TextField;
  txtError: TextField;
  btn_ok?: PushButton;
  /** June-2004 API (`this._parent.setTextError`): show `txt`, or hide the line when undefined. Nothing in 5b calls it. */
  setTextError(txt?: string): void;
};

const W = 260, X = (742 - W) / 2, Y = 200;
const BLUE = 0x0e5c9a, ORANGE = 0xff6600;

function rect(mc: MovieClip, x: number, y: number, w: number, h: number) {
  mc.moveTo(x, y);
  mc.lineTo(x + w, y);
  mc.lineTo(x + w, y + h);
  mc.lineTo(x, y + h);
  mc.lineTo(x, y);
  mc.endFill();
}
function box(mc: MovieClip, x: number, y: number, w: number, h: number, rgb: number, line?: number) {
  if (line !== undefined) mc.lineStyle(2, line, 100);
  else mc.lineStyle();
  mc.beginFill(rgb, 100);
  rect(mc, x, y, w, h);
}

function field(c: MovieClip, name: string, depth: number, x: number, y: number, w: number, h: number, size: number, color: number, input: boolean) {
  const t = c.createTextField(name, depth, x, y, w, h);
  const f = new TextFormat("Font2", size, color);
  if (!input) f.align = "center";
  t.setNewTextFormat(f);
  t.embedFonts = true;
  t.selectable = input;
  if (input) t.type = "input";
  return t;
}

/** Builds the login form into `INTERFACE.CommonLayer_mc.loginInterface` (authored). */
export function drawLoginSubstitute(container: MovieClip & { onLogin: (login: string, password: string) => void }) {
  const c = container as LoginInterface;
  const bg = c.createEmptyMovieClip("background_mc", 1);
  bg.beginGradientFill("linear", [0x0b4f86, 0x4aa3e0], [100, 100], [0, 255], { matrixType: "box", x: 0, y: 0, w: 742, h: 550, r: Math.PI / 2 });
  rect(bg, 0, 0, 742, 550);
  box(bg, X - 20, Y - 20, W + 40, 190, 0x0b4f86, 0xffffff);
  const rows: [string, string, number][] = [["ACCOUNT", "txtName", Y], ["PASSWORD", "txtPass", Y + 60]];
  rows.forEach(([key, name, y], i) => {
    box(bg, X + 60, y, W - 120, 18, ORANGE);
    field(c, `lbl${i}`, 10 + i, X + 60, y, W - 120, 18, 11, 0xffffff, false).text = getText(key) ?? "";
    box(bg, X, y + 22, W, 22, 0xffffff, BLUE);
    field(c, name, 20 + i, X + 2, y + 24, W - 4, 20, 11, 0x000000, true);
  });
  c.txtPass.password = true;
  c.txtError = field(c, "txtError", 30, X - 20, Y + 175, W + 40, 34, 10, ORANGE, false);
  c.txtError.wordWrap = c.txtError.multiline = true;
  c.txtError._visible = false;
  c.setTextError = (txt?: string) => {
    if (txt != undefined) {
      c.txtError.text = txt;
      c.txtError._visible = true;
    } else c.txtError._visible = false;
  };
  const ok = c.attachMovie("Ank::Dofus::PushButton", "btn_ok", 40, { label: "OK", clickHandler: "", labelClipSymbol: "FLabelSymbol" }) as PushButton | undefined;
  if (ok) {
    ok._x = X + W / 2 - ok._width / 2;
    ok._y = Y + 130;
    ok.onRelease = () => c.onLogin(c.txtName.text, c.txtPass.text);
  }
  Selection.setFocus(c.txtName);
}
loginSubstitute.draw = drawLoginSubstitute;
