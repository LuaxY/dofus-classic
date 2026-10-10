// AKSClient/Dofus.KeyListener.as (Class_KeyListener, KERNEL.KeyListener): chat history keys, Enter dispatch on the
// focused text field, and the banner shortcuts. The DEBUG_MODE-only branches (:155-196, :233-328) are not ported:
// DEBUG_MODE is false in this build (Dofus.Kernel.Init.as:4), so they never run.
import { SERVER_NAME, SERVER_PORT } from "../../core/constants.ts";
import { Key, type MovieClip, player, Selection, type TextField } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import { banner } from "./kernel.ts";

type Field = TextField & { _parent?: MovieClip };

export class KeyListener {
  justValidEnter = false;

  constructor() {
    this.init();
    this.justValidEnter = false;
  }

  init(): void {
    this.setEnabled(true); // :330
  }

  /** :9-35 */
  onKeyUp(): void {
    const field = G.AKS.Chat.output?.txtConsole;
    if (Key.getCode() == 13 && !this.justValidEnter) {
      Selection.setFocus(field);
      this.justValidEnter = false;
    }
    const k = Key.getCode();
    if ((k == 38 || k == 33 || k == 40 || k == 34) && G.AKS.Chat.output && field) {
      Selection.setFocus(field);
      Selection.setSelection(field.text.length, 1000);
    }
  }

  /** :36-232 */
  onKeyDown(): void {
    const out = G.AKS.Chat.output, C = G.AKS.Console;
    const field = out?.txtConsole;
    const set = (v: string | undefined) => field && (field.text = v ?? "");
    if (Key.isDown(33) && out) set(C.getWhisperHistoryUp());
    if (Key.isDown(34) && out) set(C.getWhisperHistoryDown());
    if (Key.isDown(38) && out) set(Key.isDown(16) ? C.getWhisperHistoryUp() : C.getHistoryUp());
    if (Key.isDown(40) && out) set(Key.isDown(16) ? C.getWhisperHistoryDown() : C.getHistoryDown());
    if (Key.isDown(13)) {
      const sel = player.focus as Field | undefined; // eval(Selection.getFocus())
      if (sel == undefined) return;
      this.justValidEnter = true;
      switch (sel._name) {
        case "txtName":
        case "txtPass": {
          const p = sel._parent as (MovieClip & { txtName?: TextField; txtPass?: TextField }) | undefined;
          G.DATACENTER.Player.login = p?.txtName?.text;
          G.DATACENTER.Player.password = p?.txtPass?.text;
          G.AKS.connect(SERVER_NAME, SERVER_PORT);
          break;
        }
        case "txtConsole":
          if (sel.text.length != 0) {
            C.process(sel.text);
            sel.text = "";
            this.justValidEnter = false;
          }
          break;
        case "txtZone": {
          const wispBox = sel._parent?._parent as (MovieClip & { to?: string }) | undefined;
          if (sel.text.length != 0) G.AKS.Chat.send(sel.text, String(wispBox?.to));
          wispBox?.removeMovieClip();
          break;
        }
        default:
          console.debug("on est dans : " + sel._name);
      }
      return;
    }
    if (Selection.getFocus() != undefined) return;
    const b = banner();
    if (Key.isDown(32)) b?.showNextSpellTab();
    if (Key.isDown(65)) b?.showPanel("Inventory");
    if (Key.isDown(73)) b?.showPanel("Inventory");
    if (Key.isDown(67)) b?.showPanel("Inventory");
    if (Key.isDown(83)) b?.showPanel("Spells");
    if (Key.isDown(66) || Key.isDown(222)) G.KERNEL.switchToCC(G.DATACENTER.Player.CCData);
    if (Key.isDown(16)) {
      if (Key.isDown(49)) G.BATTLEFIELD.Container.show("Grid");
    } else {
      for (let k = 1; k <= 8; k++) {
        if (!Key.isDown(48 + k)) continue;
        const slot = b?.banner?.["us" + k] as (MovieClip & { container?: { onRelease?(): void } }) | undefined;
        slot?.container?.onRelease?.();
      }
    }
  }

  /** :332-342 */
  setEnabled(bool: boolean): void {
    if (bool) Key.addListener(this as unknown as Record<string, unknown>);
    else Key.removeListener(this as unknown as Record<string, unknown>);
  }
}
