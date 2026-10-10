// Timeline scripts of AKSClient.swf symbols owned by the battlefield, for the runtime's `scriptHook`
// (docs/runtime.md §4.6; agent C merges every owner's table). Without them the 16-frame cell symbols play through
// their slope frames whenever no gotoAndStop(slope) is issued (flat cells).
import type { DisplayObject } from "../../runtime/player.ts";

type Script = (this: DisplayObject) => void;
const stop: Script = function () {
  (this as DisplayObject & { stop(): void }).stop();
};

export const battlefieldScripts: Record<string, Script> = {
  "AKSClient.swf#15@1": stop, // DefineSprite_15_Mc_Selection/frame_1/DoAction.as
  "AKSClient.swf#31@1": stop, // DefineSprite_31_MC_Cell_Grid/frame_1/DoAction.as
  "AKSClient.swf#48@1": stop, // DefineSprite_48_MC_Cell_Full/frame_1/DoAction.as
  "AKSClient.swf#50@1": stop, // DefineSprite_50_Dofus.Cell/frame_1/DoAction.as
};
