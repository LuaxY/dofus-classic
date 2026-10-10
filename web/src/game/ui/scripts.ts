// Timeline / clip-action scripts of modules/Interfaces.swf owned by B1 (docs/runtime.md §4.6 key format), merged by
// the kernel into the Player's scriptHook. Importing this module also registers every B1 class (Object.registerClass).
// `this` = the timeline (frame actions) or the clip (clip actions). Sources: modules_Interfaces/<folder>/… per entry.
import { getText } from "../../core/lang.ts";
import { MovieClip, Selection, type DisplayObject } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import "./ank.ts";
import "./controls.ts";
import "./interface.ts";
import "./widgets.ts";
import type { FUIComponentClass } from "./framework.ts";
import type { Interface } from "./interface.ts";
import { S } from "./siblings.ts";
import type { VolumeGauge, Interface_ButtonMute } from "./widgets.ts";
import "./windows.ts";

type Script = (this: MovieClip) => void;
const SWF = "modules/Interfaces.swf";
const stop: Script = function () {
  this.stop();
};
/** `var component = <path>; component.registerSkinElement(<child>, <style>) …` (skin frame scripts). */
const skin = (up: (c: MovieClip) => unknown, pairs: [string, string][], andStop = false): Script =>
  function () {
    if (up !== keep) this.component = up(this);
    const c = this.component as FUIComponentClass | undefined;
    for (const [child, style] of pairs) c?.registerSkinElement?.(this[child], style);
    if (andStop) this.stop();
  };
const keep = (c: MovieClip) => c.component;
const parent = (c: MovieClip) => c._parent;
const grandParent = (c: MovieClip) => c._parent?._parent;
const bevel: [string, string][] = [["shadow_mc", "shadow"], ["darkshadow_mc", "darkshadow"], ["highlight_mc", "highlight"], ["highlight3D_mc", "highlight3D"]];

type Button = MovieClip & { setLabel(l: unknown): void; owner?: { hide(): void } };
/** PushButton `on(initialize)` parameters (every Dofus instance: clickHandler "", FLabelSymbol). */
const pbInit = (label: string): Script =>
  function () {
    Object.assign(this, { label, clickHandler: "", labelClipSymbol: "FLabelSymbol" });
  };
/** PushButton `onClipEvent(load)`: `this._xscale = this._yscale = 80; this.setLabel(<text>)`. */
const pbLoad = (text: () => unknown): Script =>
  function () {
    this._xscale = this._yscale = 80;
    (this as Button).setLabel(text());
  };
const closeBox: Script = function () {
  ((this._parent as Button | undefined)?.owner)?.hide();
};
/** The three clip actions of a PushButton placed at `depth` in sprite `sprite`. */
const pb = (sprite: number, depth: number, label: string, text: () => unknown, release: Script) => ({
  [`${SWF}#${sprite}@1:${depth}:initialize`]: pbInit(label),
  [`${SWF}#${sprite}@1:${depth}:load`]: pbLoad(text),
  [`${SWF}#${sprite}@1:${depth}:release`]: release,
});
type Whisper = MovieClip & { txtZone: { text: string }; params: { to: unknown }; owner: { hide(): void } };
const gauge = (depth: number, get: () => number | undefined, set: (v: number) => void) => ({
  /** S906/903_Interface.VolumeGauge_<d> on(initialize) */
  [`${SWF}#906@1:${depth}:initialize`]: function (this: MovieClip) {
    Object.assign(this, { maxValue: 100, divisionCount: 20, defaultColor: 3442887, activeColor: 16737792 });
  },
  /** S906/903_Interface.VolumeGauge_<d> onClipEvent(load) */
  [`${SWF}#906@1:${depth}:load`]: function (this: MovieClip) {
    const g = this as VolumeGauge;
    g.setValue(get() as number);
    g.onChange = (value) => set(value);
  },
});
const mute = (depth: number, backSymbol: string, tip: string, get: () => boolean | undefined, set: (b: boolean) => void) => ({
  /** S906/900_Interface.ButtonMute_<d> on(initialize) */
  [`${SWF}#906@1:${depth}:initialize`]: function (this: MovieClip) {
    this.backSymbol = backSymbol;
  },
  /** S906/900_Interface.ButtonMute_<d> onClipEvent(load) */
  [`${SWF}#906@1:${depth}:load`]: function (this: MovieClip) {
    const b = this as Interface_ButtonMute;
    b.setEnabled(true);
    b.select(get() as boolean);
    b.setToolTip(getText(tip));
    b.onChange = (value) => set(value);
  },
});

const entries: Record<string, Script> = {
  /** frame_1/DoAction.as — creates INTERFACE. */
  [`${SWF}#0@1`]: function () {
    this.attachMovie("Dofus::Interface", "interfaceClip", 0);
    G.INTERFACE = this.interfaceClip as Interface;
  },

  // ---- component internals: stop() / deadPreview / skin registration ---------------------------------------------
  [`${SWF}#24@1`]: skin(parent, [["boundingBox", "background"]], true), // DefineSprite_24_FBoundingBoxSymbol/frame_1
  [`${SWF}#24@2`]: skin(keep, [["boundingBox2", "backgroundDisabled"]], true), // …/frame_2
  [`${SWF}#27@1`]: function () { // DefineSprite_27_Ank.Dofus.PushButton/frame_1
    const bb = this.boundingBox_mc, dp = this.deadPreview;
    if (bb instanceof MovieClip) bb._visible = false;
    if (dp instanceof MovieClip) dp._visible = false;
  },
  [`${SWF}#240@1`]: function () { // DefineSprite_240_Ank.Dofus.ListBox/frame_1
    if (this.deadPreview instanceof MovieClip) this.deadPreview._visible = false;
  },
  [`${SWF}#244@1`]: function () { // DefineSprite_244_Ank.Dofus.ComboBox/frame_1
    if (this.deadPreview instanceof MovieClip) this.deadPreview._visible = false;
  },
  /** DefineSprite_237_FScrollSelectListSymbol: the hidden `scrollBarAsset`. */
  [`${SWF}#237@1:1:initialize`]: function () {
    Object.assign(this, { _targetInstanceName: "", horizontal: false, thumbPointer: true });
  },
  [`${SWF}#237@1:1:load`]: function () {
    this._width = this._height = 0;
  },
  [`${SWF}#229@1`]: skin(parent, [["track_mc", "scrollTrack"]]), // DefineSprite_229 (ScrollBar track)
  [`${SWF}#434@1`]: stop, [`${SWF}#434@2`]: stop, [`${SWF}#434@3`]: stop, // DownArrowComboBox
  [`${SWF}#458@1`]: stop, [`${SWF}#458@2`]: stop, [`${SWF}#458@3`]: stop, [`${SWF}#458@4`]: stop, // fpb_states
  [`${SWF}#464@1`]: skin((c) => c._parent?.controller, [["highlight_mc", "selection"]], true), // FHighlightSymbol
  [`${SWF}#464@2`]: skin(keep, [["highlight_mc2", "selectionDisabled"]], true),
  [`${SWF}#464@3`]: skin(keep, [["highlight_mc3", "selectionUnfocused"]], true),
  [`${SWF}#469@1`]: skin(grandParent, [["arrow_mc", "arrow"], ["face_mc", "face"]]), // DefineSprite_469 (arrow up state)
  [`${SWF}#473@1`]: skin(grandParent, [["arrow_mc", "arrow"], ["face_mc", "face"]]), // DefineSprite_473 (down state)
  [`${SWF}#478@1`]: skin(grandParent, [["face_mc", "face"]]), // DefineSprite_478 (disabled state)
  [`${SWF}#479@1`]: stop, [`${SWF}#479@2`]: stop, [`${SWF}#479@3`]: stop, // UpArrow
  [`${SWF}#484@1`]: skin(grandParent, bevel), // DefineSprite_484 (thumb top)
  [`${SWF}#486@1`]: skin(grandParent, bevel), // DefineSprite_486 (thumb bottom)
  [`${SWF}#489@1`]: skin(grandParent, [["face_mc", "face"], ...bevel]), // DefineSprite_489 (thumb middle)
  [`${SWF}#490@1`]: stop, // ScrollThumb
  [`${SWF}#491@1`]: stop, [`${SWF}#491@2`]: stop, [`${SWF}#491@3`]: stop, // DownArrow
  [`${SWF}#733@1`]: stop, [`${SWF}#733@3`]: stop, // Interface.Waiting

  // ---- DefineSprite_144_Interface.WindowBox: the full-stage clip under the window is the modal mouse blocker -------
  [`${SWF}#144@1:1:load`]: function () {
    this.useHandCursor = false;
  },
  [`${SWF}#144@1:1:rollOver`]: function () {}, // `if(false){}`: the handler is what makes the clip catch the mouse

  // ---- boxes ------------------------------------------------------------------------------------------------------
  ...pb(909, 2, "C", () => getText("CLOSE"), closeBox), // boxMessage close_btn
  ...pb(897, 8, "Y", () => getText("YES"), function () { // boxYesNo yes_btn
    G.INTERFACE.onQuestionBoxYes?.();
    closeBox.call(this);
  }),
  ...pb(897, 2, "N", () => getText("NO"), function () { // boxYesNo no_btn
    G.INTERFACE.onQuestionBoxNo?.();
    closeBox.call(this);
  }),
  ...pb(895, 9, "F", () => getText("ADD_TO_FRIENDS"), function () { // boxWhisper btnAddFriend
    S.AKS?.Account?.addFriend?.((this._parent as Whisper).params.to);
  }),
  ...pb(895, 15, "S", () => getText("SEND"), function () { // boxWhisper btnSend
    const w = this._parent as Whisper;
    if (w.txtZone.text.length !== 0) {
      S.AKS?.Chat?.send?.(w.txtZone.text, w.params.to);
      w.owner.hide();
    } else Selection.setFocus(w.txtZone);
  }),
  ...pb(895, 3, "A", () => getText("CANCEL_SMALL"), closeBox), // boxWhisper btnCancel
  ...pb(906, 1, "C", () => getText("CLOSE"), closeBox), // boxOptions close_btn
  ...gauge(7, () => S.SOMA?.getVolumeMusic?.(), (v) => S.SOMA?.setVolumeMusic?.(v)),
  ...gauge(9, () => S.SOMA?.getVolumeSound?.(), (v) => S.SOMA?.setVolumeSound?.(v)),
  ...mute(13, "MuteMusic", "MUTE_MUSIC", () => S.SOMA?.getMuteMusic?.(), (b) => S.SOMA?.setMuteMusic?.(b)),
  ...mute(15, "MuteSound", "MUTE_SOUNDS", () => S.SOMA?.getMuteSound?.(), (b) => S.SOMA?.setMuteSound?.(b)),
  // boxMenu: hard-coded French labels (docs/logic/ui.md §6.4)
  ...pb(907, 20, "Q", () => "Changer de perso", function () { // quit_btn
    S.KERNEL?.quit?.();
    closeBox.call(this);
  }),
  ...pb(907, 8, "Q", () => "Abandonner", function () { // giveup_btn
    S.KERNEL?.giveUpGame?.();
    closeBox.call(this);
  }),
  ...pb(907, 2, "Q", () => "Déconnexion", function () { // disconnect_btn
    S.KERNEL?.disconnect?.();
    closeBox.call(this);
  }),
  ...pb(907, 14, "Q", () => "Annuler", closeBox), // cancel_btn
};

export const scripts = entries as Record<string, (this: DisplayObject) => void>;
