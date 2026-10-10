// Start menu and character list of modules/Interfaces.swf (docs/logic/ui.md §2.2-2.3).
import { SITE_PATH } from "../../../core/constants.ts";
import { getText } from "../../../core/lang.ts";
import { str } from "../../../core/swf6.ts";
import { type DisplayObject, MovieClip, registerClass } from "../../../runtime/player.ts";
import { G } from "../../globals.ts";
import { call, type PushButton, T, type Txt } from "./as.ts";

/** `getURL("javascript:winopen('<url>',w,h)")` needs a `winopen` function in the host page (lost). Replacement
 *  (provenance `authored`): open the URL in a new window of that size, when a browser window exists. */
const winopen = (url: string, w: number, h: number) => void globalThis.open?.(url, "_blank", `width=${w},height=${h}`);

/** `__Packages/dofus/graphics/gui/UIStartMenu.as` (linkage `UIStartMenu`, sprite 997), drawn by `INTERFACE.drawMenuInterface`. */
export class UIStartMenu extends MovieClip {
  declare title_txt: Txt;
  declare play_btn?: PushButton;
  declare download_btn?: PushButton;
  declare infos_btn?: PushButton;
  declare bug_btn?: PushButton;
  declare instructions_btn?: PushButton;
  declare rules_btn?: PushButton;
  constructor() {
    super();
    this.initialize();
  }
  initialize() {
    this.title_txt?.setText(getText("MENU_TITLE"), "Font2");
    this.onEnterFrame = () => {
      this.play_btn?.setLabel(getText("MENU_PLAY"));
      this.download_btn?.setLabel(getText("MENU_DOWNLOAD"));
      this.infos_btn?.setLabel(getText("MENU_INFOS"));
      this.bug_btn?.setLabel(getText("MENU_BUG"));
      this.instructions_btn?.setLabel(getText("MENU_INSTRUCTIONS"));
      this.rules_btn?.setLabel(getText("MENU_RULES"));
      delete this.onEnterFrame;
    };
    // Overwriting onRelease bypasses the PushButton click path (ui.md §2.2).
    const site = "http://" + SITE_PATH;
    const links: [PushButton | undefined, () => void][] = [
      [this.play_btn, () => G.AKS.Account.getCharacters()],
      [this.download_btn, () => winopen(site + "/files/download/download.php", 700, 590)],
      [this.infos_btn, () => winopen(site + "/files/modifyAccount.php", 600, 580)],
      [this.bug_btn, () => winopen(site + "/files/bugreport/index.php", 500, 360)],
      [this.instructions_btn, () => winopen("http://ankama.online.fr/dl/DofusGuideUtilisateur.pdf", 500, 500)],
      [this.rules_btn, () => winopen(site + "/files/charteBeta.php", 500, 500)],
    ];
    for (const [b, f] of links) if (b) b.onRelease = f;
  }
}
registerClass("UIStartMenu", UIStartMenu);

declare module "../interface.ts" {
  interface Interface { UIInterfaceCharacters?: Class_Characters }
}

/** A character of the list (`AKSClient/Dofus.Client.DataProcessor.as:131-150`; core `CharacterListEntry`). */
export type CharacterEntry = { id?: unknown; name?: unknown; level?: unknown; file?: string; color1?: unknown; color2?: unknown; color3?: unknown; [k: string]: unknown };

/** `Interface.Characters.as` (sprite 644): 10 slots, 5×2. Drawn by `AKS.Account.onGetCharacters`. */
export class Class_Characters extends MovieClip {
  declare CHOICEX: number;
  declare CHOICEY: number;
  declare CHOICEXSPACING: number;
  declare CHOICEYSPACING: number;
  declare selectedcharacterID: unknown;
  declare selectedcharacterData: CharacterEntry | undefined;
  declare selectedCharacter: number | undefined;
  declare btnCreate?: PushButton;
  declare btnDelete?: PushButton;
  declare btnPlay?: PushButton;
  declare title_txt: Txt;
  constructor() {
    super();
    this.init();
  }
  init() {
    this.CHOICEX = 0;
    this.CHOICEY = 181;
    this.CHOICEXSPACING = 149;
    this.CHOICEYSPACING = 115;
    this.onEnterFrame = () => {
      this.btnCreate?.setLabel(getText("CREATE"));
      this.btnDelete?.setLabel(getText("DELETE"));
      this.btnPlay?.setLabel(getText("PLAY"));
      this.title_txt?.setText(getText("CHOOSE_TITLE"));
      delete this.onEnterFrame;
    };
  }
  onSelectCharacter(index: number, characData: CharacterEntry) {
    this.selectedcharacterID = characData?.id;
    this.selectedcharacterData = characData;
    (this[`choice${str(this.selectedCharacter)}`] as UICharacterChoiceClass | undefined)?.select(false);
    this.selectedCharacter = index;
    (this[`choice${index}`] as UICharacterChoiceClass | undefined)?.select(true);
  }
  setCharacters(characArray: CharacterEntry[]) {
    let characCount = 0;
    for (let i = 0; i < 10; i++) {
      let c: MovieClip | undefined;
      if (i < characArray.length) {
        const d = characArray[i]!;
        c = this.attachMovie("Interface::Characters::Choice", "choice" + i, i + 1);
        if (c) {
          const perso = c.createEmptyMovieClip("perso", 10);
          perso.loadMovie(str(d.file)); // `loadMovie(file, 10)`: the 2nd argument is ignored for clips
          perso._y = 60;
          perso._x = 75;
          c.name = d.name; // EditText variables `name` / `level` of sprite 639
          c.level = T("LEVEL") + " " + str(d.level);
          c._data = d;
          c.id = d.id;
          c.index = i;
          G.CCOLORS.addCharacter(perso);
          G.CCOLORS.setColor(perso._target, d.color1, d.color2, d.color3);
          G.WEAPONS.addCharacter(perso);
          G.WEAPONS.setData(perso._target, d as never);
        }
        characCount++;
      } else c = this.attachMovie("Interface::Characters::Empty", "choice" + i, i + 1);
      if (c) {
        c._x = this.CHOICEX + this.CHOICEXSPACING * (i % 5);
        c._y = this.CHOICEY + this.CHOICEYSPACING * Math.floor(i / 5);
      }
    }
    if (characCount >= 10) call(this.btnAdd, "setEnabled", false); // AS bug kept: the button is `btnCreate` → no-op (ui.md §2.3)
  }
}
registerClass("Interface::Characters", Class_Characters);

/** `Interface.Characters.Choice.as` (sprite 639): selected = marker frame 1, "castR"; else frame 2, "waitR" stopped. */
export class UICharacterChoiceClass extends MovieClip {
  declare selectedMarker?: MovieClip;
  declare btn?: DisplayObject; // B634
  declare perso?: MovieClip;
  constructor() {
    super();
    this.select(false);
  }
  select(bool: boolean) {
    this.selectedMarker?.gotoAndStop(!bool ? 2 : 1);
    if (this.btn) this.btn._visible = !bool;
    if (bool) this.perso?.gotoAndStop("castR");
    else {
      this.perso?.gotoAndStop("waitR");
      this.perso?.stopAllClip();
    }
  }
}
registerClass("Interface::Characters::Choice", UICharacterChoiceClass);
