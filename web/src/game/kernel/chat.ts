// AKSClient/Dofus.Chat.as (Class_Chat, `_global.CHAT`, Dofus.Kernel.Init.as:63): chat log by category (the
// colour decides), rendered into AKS.Chat.output.txtChat.
import { ERROR_CHAT_COLOR, INFO_CHAT_COLOR, MSG_CHAT_COLOR, MSGCHUCHOTE_CHAT_COLOR } from "../../core/constants.ts";
import type { TextField } from "../../runtime/player.ts";
import { G } from "../globals.ts";

declare module "../globals.ts" {
  interface Globals {
    CHAT: Chat;
  }
}

interface Line {
  arrayType: string[];
  type: number;
  index: number;
  col: string;
}

export class Chat {
  readonly TYPE_MESSAGES = 1;
  readonly TYPE_WISP = 2;
  readonly TYPE_INFOS = 3;
  readonly TYPE_ERRORS = 4;
  All: Line[] = [];
  Type1: string[] = [];
  Type2: string[] = [];
  Type3: string[] = [];
  Type4: string[] = [];
  bType1 = true;
  bType2 = true;
  bType3 = true;
  bType4 = true;

  constructor() {
    this.init();
  }

  /** :11-15 */
  init(): void {
    this.clear();
    this.setTypes(true, true, true, true);
  }

  /** :16-24 */
  clear(): void {
    this.All = [];
    this.Type1 = [];
    this.Type2 = [];
    this.Type3 = [];
    this.Type4 = [];
  }

  /** :25-45 */
  setTypes(bType1?: boolean, bType2?: boolean, bType3?: boolean, bType4?: boolean): void {
    if (bType1 != undefined) this.bType1 = bType1;
    if (bType2 != undefined) this.bType2 = bType2;
    if (bType3 != undefined) this.bType3 = bType3;
    if (bType4 != undefined) this.bType4 = bType4;
    this.refresh();
  }

  /** :46-76 — whisper and error lines also play a sound. */
  addText(text: string | undefined, col: string): void {
    let type: number;
    switch (col) {
      case MSG_CHAT_COLOR: type = this.TYPE_MESSAGES; break;
      case MSGCHUCHOTE_CHAT_COLOR:
        type = this.TYPE_WISP;
        G.SOMA?.onChatWisper();
        break;
      case INFO_CHAT_COLOR: type = this.TYPE_INFOS; break;
      case ERROR_CHAT_COLOR:
        type = this.TYPE_ERRORS;
        G.SOMA?.onError();
        break;
      default:
        console.warn("Erreur : mauvaise couleur " + text);
        return;
    }
    const arrayType = this[`Type${type}` as "Type1"];
    const index = arrayType.push(text ?? "");
    this.All.push({ arrayType, type, index: index - 1, col });
    this.refresh();
  }

  /** :77-110 — last 30 visible lines; fewer than 15 are padded so the text starts at the bottom. */
  refresh(): void {
    const out = (G.AKS?.Chat.output as { txtChat?: TextField } | undefined)?.txtChat;
    let html = "";
    let count = 0;
    for (let i = this.All.length - 1; count < 30 && i >= 0; i--) {
      const l = this.All[i]!;
      if (this[`bType${l.type}` as "bType1"]) {
        count++;
        html = "<br><font color='#" + l.col + "'>" + l.arrayType[l.index] + "</font>" + html;
      }
    }
    if (!out) return; // AS: every member of an undefined output is a no-op
    if (count < 15) {
      out.initChat();
      out.htmlText += html;
    } else out.htmlText = html;
    if (Math.abs(out.maxscroll - out.scroll) < 4) out.scroll = out.maxscroll;
  }
}
