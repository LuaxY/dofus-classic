// Port of Dofus.Client.Console.as (Class_Client_Console): chat-line command interpreter + input histories.
// `process` returns what the AS would send (built with protocol.ts) and the chat lines it would print
// (KERNEL.traceToChat), instead of performing them. The AS constructor calls a non-existent `Init()` (no-op).
import { ERROR_CHAT_COLOR, INFO_CHAT_COLOR, VERSION } from "./constants.ts";
import { getText } from "./lang.ts";
import * as P from "./protocol.ts";
import { str } from "./swf6.ts";

export type ConsoleOutput = { type: "send"; data: string } | { type: "chat"; text: string | undefined; color: string };

const chat = (text: string | undefined, color: string): ConsoleOutput => ({ type: "chat", text, color });
const sendOut = (data: string | null): ConsoleOutput[] => (data == null ? [] : [{ type: "send", data }]);

export class Console {
  consoleHistory: string[] = [];
  consoleHistoryPointer = 0;
  whisperHistory: string[] = [];
  whisperHistoryPointer = 0;

  /**
   * Console.as:12-113. `playerName` is DATACENTER.Player.name, for Chat.send's "can't whisper yourself" check
   * (Client.Chat.as:11-14), which also applies to "*" and "#" destinations.
   */
  process(cmd: string, playerName: string | null = null): ConsoleOutput[] {
    this.pushHistory(cmd);
    const chatSend = (msg: string, dest: string): ConsoleOutput[] =>
      dest == playerName ? [chat(getText("CANT_WISP_YOURSELF"), ERROR_CHAT_COLOR)] : sendOut(P.chatMessage(msg, dest));
    if (cmd.charCodeAt(0) != 47) return chatSend(cmd, "*"); // not "/"
    let pos = cmd.indexOf(" ");
    if (pos == -1) pos = cmd.length;
    const command = cmd.substring(1, pos).toUpperCase();
    switch (command) {
      case "VERSION":
      case "VER":
        return [chat("DOFUS v" + VERSION, INFO_CHAT_COLOR)];
      case "C": // raw message
        return sendOut(P.send(cmd.substr(3) + "\n"));
      case "COUNT":
        return sendOut(P.getInfos());
      case "T": // team
        return chatSend(cmd.substr(3), "#");
      case "W":
      case "MSG":
      case "WHISPER": {
        const int1 = command.length + 2;
        const p = cmd.indexOf(" ", int1);
        if (p == -1) {
          return [chat(getText("SYNTAX_ERROR", [" /w &lt;" + str(getText("NAME", [])) + "&gt; &lt;" + str(getText("MSG", [])) + "&gt;"]), ERROR_CHAT_COLOR)];
        }
        const name = cmd.substring(int1, p);
        this.pushWhisper("/w " + name + " ");
        return chatSend(cmd.substring(p + 1), name);
      }
      case "J":
      case "JOIN":
        return sendOut(P.joinChannel(cmd.substring(command.length + 2)));
      case "WHOAMI":
        return sendOut(P.whoAmI());
      case "WHOIS":
        if (cmd.length < 8) return [chat(getText("SYNTAX_ERROR", [" /whois &lt;" + str(getText("NAME", [])) + "&gt;"]), ERROR_CHAT_COLOR)];
        return sendOut(P.whoIs(cmd.substring(7)));
      case "F":
      case "FRIEND":
      case "FRIENDS": {
        const params = cmd.split(" ");
        const op = str(params[1]).toUpperCase(); // String(undefined) is "" in SWF 6
        const name = str(params[2]);
        if (op.length != 1 || (name.length == 0 && op != "L")) {
          return [chat(getText("SYNTAX_ERROR", [" /f &lt;A/D/L&gt; &lt;" + str(getText("NAME", [])) + "&gt;"]), ERROR_CHAT_COLOR)];
        }
        switch (op) {
          case "A":
          case "+":
            return sendOut(P.addFriend(name));
          case "D":
          case "R":
          case "-":
            return sendOut(P.removeFriend(name));
          case "L":
            return sendOut(P.getFriendsList());
          default:
            return [chat(getText("SYNTAX_ERROR", [" /f &lt;A/D&gt; &lt;" + str(getText("NAME", [])) + "&gt;"]), ERROR_CHAT_COLOR)];
        }
      }
      default:
        return [chat(getText("UNKNOW_COMMAND", [command]), ERROR_CHAT_COLOR)];
    }
  }

  /** Console.as:114-128 — skips a repeat of the last entry, keeps 50. */
  pushHistory(cmd: string): void {
    if (this.consoleHistory.slice(-1)[0] != cmd && this.consoleHistory.push(cmd) > 50) this.consoleHistory.shift();
    this.consoleHistoryPointer = this.consoleHistory.length;
  }
  getHistoryUp(): string | undefined {
    if (this.consoleHistoryPointer > 0) this.consoleHistoryPointer--;
    return this.consoleHistory[this.consoleHistoryPointer];
  }
  getHistoryDown(): string | undefined {
    if (this.consoleHistoryPointer < this.consoleHistory.length) this.consoleHistoryPointer++;
    return this.consoleHistory[this.consoleHistoryPointer];
  }
  /** Console.as:149-163 */
  pushWhisper(cmd: string): void {
    if (this.whisperHistory.slice(-1)[0] != cmd && this.whisperHistory.push(cmd) > 50) this.whisperHistory.shift();
    this.whisperHistoryPointer = this.whisperHistory.length;
  }
  getWhisperHistoryUp(): string | undefined {
    if (this.whisperHistoryPointer > 0) this.whisperHistoryPointer--;
    return this.whisperHistory[this.whisperHistoryPointer];
  }
  getWhisperHistoryDown(): string | undefined {
    if (this.whisperHistoryPointer < this.whisperHistory.length) this.whisperHistoryPointer++;
    return this.whisperHistory[this.whisperHistoryPointer];
  }
}
