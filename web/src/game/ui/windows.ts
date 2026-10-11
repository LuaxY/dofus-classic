// Modal boxes: Interface.WindowBox.as / Interface.Window.as and the content symbols boxMessage, boxYesNo, boxMenu,
// boxOptions, boxWhisper (docs/logic/ui.md §2.14). Content clips read `this.params` and close with `this.owner.hide()`.
// Their buttons' clip actions (labels, Yes/No, Send…) are in scripts.ts.
import { str } from "../../core/swf6.ts";
import { getText } from "../../core/lang.ts";
import { toLobby } from "../../core/protocol.ts";
import { Key, MovieClip, registerClass, Selection, Stage, TextField } from "../../runtime/player.ts";
import type { FPushButtonClass } from "./controls.ts";
import { S } from "./siblings.ts";

/** Interface.WindowBox.as — initObject title, containerSymbol, containerParams. */
export class WindowBox extends MovieClip {
  declare title: unknown;
  declare containerSymbol: string | undefined;
  declare containerParams: Record<string, unknown> | undefined;
  declare window_mc: Window | undefined;
  constructor() {
    super();
    this.init();
  }
  /** :7-21 */
  init() {
    if (this.containerSymbol === undefined) return this.hide();
    const w = this.attachMovie("Interface::Window", "window_mc", 10, { owner: this, title: this.title, containerSymbol: this.containerSymbol, containerParams: this.containerParams });
    if (!w) return;
    w._x = (Stage.width - w._width) / 2;
    w._y = (Stage.height - w._height) / 2;
  }
  /** :22-26 */
  hide() {
    S.KERNEL?.KeyListener?.setEnabled(true);
    this.removeMovieClip();
  }
}
registerClass("Interface::WindowBox", WindowBox);

type Parts = MovieClip & Record<"borderLeft_mc" | "center_mc" | "borderRight_mc" | "cornerLeft_mc" | "borderBottom_mc" | "cornerRight_mc", MovieClip>;
type Title = MovieClip & Record<"left_mc" | "middle_mc" | "right_mc", MovieClip> & { title_txt: TextField };
/** Interface.Window.as — 9-slice frame sized to the content + title bar that drags the window. */
export class Window extends MovieClip {
  declare owner: { hide(): void };
  declare title: unknown;
  declare containerSymbol: string;
  declare containerParams: unknown;
  declare title_mc: Title;
  declare main_mc: Parts;
  constructor() {
    super();
    this.init();
  }
  /** :7-53 */
  init() {
    if (this.owner === undefined) this.owner = this as unknown as { hide(): void };
    const t = this.title_mc, m = this.main_mc;
    const c = m.attachMovie(this.containerSymbol, "container_mc", 10, { owner: this.owner, params: this.containerParams });
    const b = c ? c.getBounds() : { xMin: 0, xMax: 0, yMin: 0, yMax: 0 };
    const w = b.xMax - b.xMin, h = b.yMax - b.yMin + 10;
    if (c) (c._x = 10 - b.xMin), (c._y = 10 - b.yMin);
    t.middle_mc._x = t.left_mc._width;
    t.middle_mc._width = w;
    t.right_mc._x = t.left_mc._width + t.right_mc._width + w;
    const tt = t.title_txt;
    tt._x = 10;
    tt._y = 5;
    tt._width = w;
    tt._height = 15;
    t.onPress = function (this: MovieClip) {
      this._parent?.startDrag(false);
    };
    t.onRelease = t.onReleaseOutside = function (this: MovieClip) {
      this._parent?.stopDrag();
    };
    if (this.title !== undefined) tt.setText(this.title, "Font2");
    m.borderLeft_mc._height = h;
    m.center_mc._x = m.borderLeft_mc._width;
    m.center_mc._width = w;
    m.center_mc._height = h;
    m.borderRight_mc._x = m.borderLeft_mc._width + m.borderRight_mc._width + w;
    m.borderRight_mc._height = h;
    m.cornerLeft_mc._y = h;
    m.borderBottom_mc._y = h;
    m.borderBottom_mc._width = w;
    m.cornerRight_mc._y = h;
    m.cornerRight_mc._x = m.borderRight_mc._x;
  }
}
registerClass("Interface::Window", Window);

/** Base of the content symbols: initObject `owner` (the WindowBox) and `params`. */
export class BoxContent extends MovieClip {
  declare owner: WindowBox;
  declare params: Record<string, unknown>;
}

/** boxMessage.as */
export class boxMessage extends BoxContent {
  declare message_txt: TextField;
  declare close_btn: FPushButtonClass;
  constructor() {
    super();
    this.init();
  }
  /** :7-18 */
  init() {
    const p = this.params;
    if (p.msg === undefined) p.msg = "Impossible";
    this.message_txt.autoSize = "center";
    this.message_txt.htmlText = '<p align="center">' + str(p.msg) + "</p>";
    this.close_btn._y = this.message_txt.textHeight + 10;
  }
}
registerClass("boxMessage", boxMessage);

/** boxYesNo.as */
export class boxYesNo extends BoxContent {
  declare question_txt: TextField;
  declare yes_btn: FPushButtonClass;
  declare no_btn: FPushButtonClass;
  constructor() {
    super();
    this.init();
  }
  /** :7-15 */
  init() {
    this.question_txt.autoSize = "center";
    this.question_txt.setText(this.params.msg, "Font1");
    this.yes_btn._y = this.question_txt.textHeight + 10;
    this.no_btn._y = this.question_txt.textHeight + 10;
  }
}
registerClass("boxYesNo", boxYesNo);

/** boxMenu.as — button labels are hard-coded French in the clip actions (scripts.ts, S907). */
export class boxMenu extends BoxContent {
  declare quit_btn: FPushButtonClass;
  declare disconnect_btn: FPushButtonClass;
  declare giveup_btn: FPushButtonClass;
  declare cancel_btn: FPushButtonClass;
  constructor() {
    super();
    this.init();
  }
  /** :7-15 */
  init() {
    this.quit_btn._x = 40;
    this.disconnect_btn._x = 40;
    this.giveup_btn._x = 40;
    this.giveup_btn._visible = !!S.DATACENTER?.Game.isRunning;
    this.cancel_btn._x = 40;
    if (S.DATACENTER?.Game.state == 1) this.attachLobby();
  }
  /** Authored for this port (not beta 5b): on the shared village map (`Game.state` 1 = `STATE_SOLO`,
   *  `Dofus.Client.Game.as:7`), "Aller aux combats" in the slot of "Abandonner" (shown only while a game runs), same
   *  PushButton: sends the authored `GX`; the server answers the village's `GAx;3` (docs/protocol/game.md `GX`). */
  attachLobby() {
    const g = this.giveup_btn;
    const b = this.attachMovie("Ank::Dofus::PushButton", "lobby_btn", 30, { label: getText("GO_TO_FIGHTS"), clickHandler: "", labelClipSymbol: "FLabelSymbol" }) as FPushButtonClass | undefined;
    if (!b) return;
    b.setSize(g.width, g.height);
    b._xscale = b._yscale = 80;
    b._x = 40;
    b._y = g._y;
    b.onRelease = () => {
      S.AKS?.send?.(toLobby(), false);
      this.owner.hide();
    };
  }
}
registerClass("boxMenu", boxMenu);

/** boxOptions.as — gauges and mute buttons are wired to SOMA by their clip actions (scripts.ts, S906). */
export class boxOptions extends BoxContent {
  declare music_txt: TextField;
  declare sounds_txt: TextField;
  constructor() {
    super();
    this.init();
  }
  /** :7-11 */
  init() {
    this.music_txt.setText(getText("MUSICS"), "Font1");
    this.sounds_txt.setText(getText("SOUNDS"), "Font1");
  }
}
registerClass("boxOptions", boxOptions);

/** boxWhisper.as — disables the global KeyListener until WindowBox.hide; its own Key listener is never removed. */
export class boxWhisper extends BoxContent {
  declare txtZone: TextField;
  constructor() {
    super();
    this.init();
  }
  /** :7-29 */
  init() {
    Selection.setFocus(this.txtZone);
    S.KERNEL?.KeyListener?.setEnabled(false);
    this.onKeyDown = function (this: boxWhisper) {
      if (Key.isDown(13)) {
        if (this.txtZone.text.length !== 0) S.AKS?.Chat?.send?.(this.txtZone.text, this.params.to);
        else Selection.setFocus(this.txtZone);
        this.owner.hide();
      }
    };
    Key.addListener(this);
  }
}
registerClass("boxWhisper", boxWhisper);
