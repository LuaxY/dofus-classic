// Shared helpers for the B2 screen ports (modules_Interfaces) and short names for the sibling component types they use
// (B1: web/src/game/ui/, C: ank.SWFLoader).
import type { Listener } from "../../../core/datacenter/character.ts";
import { getText } from "../../../core/lang.ts";
import { str } from "../../../core/swf6.ts";
import type { MovieClip, TextField } from "../../../runtime/player.ts";
import type { CursorData } from "../interface.ts";

export type { Interface_CheckBox as CheckBox, Interface_ProgressBar as ProgressBar, Interface_RadioButton as RadioButton } from "../widgets.ts";
export type { FComboBoxClass as ComboBox, FListBoxClass as ListBox, FPushButtonClass as PushButton, FScrollBarClass as ScrollBar } from "../controls.ts";
export type { ColorPicker, PushButton as AnkPushButton } from "../ank.ts";
export type { SWFLoader } from "../../kernel/ank.ts";

/** `getText(key, params)` used in a string expression: SWF 6 turns a missing key (undefined) into "". */
export const T = (key: string, params?: readonly unknown[]) => str(getText(key, params));

/** A child EditText reached by instance name (may be absent: SWF 6 calls on undefined are no-ops). */
export type Txt = TextField | undefined;

/** SWF 6 `obj.method(...args)` on an untyped path (`_parent._parent…`): a missing object or method is a no-op. */
export function call(obj: unknown, method: string, ...args: unknown[]): unknown {
  const f = (obj as Record<string, unknown> | null | undefined)?.[method];
  return typeof f === "function" ? f.apply(obj, args) : undefined;
}

/** Spell / item objects travel through `INTERFACE.setSpellCursor` / `lastSpellcursorData` (B1's `CursorData`). */
export const asCursor = (o: unknown) => o as CursorData | null | undefined;

/** A clip registered as listener of a core Broadcaster (`DATACENTER.Player.data.addListener(this)`). */
export const asListener = (o: object) => o as unknown as Listener;
