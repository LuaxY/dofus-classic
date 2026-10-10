// AKSClient/Events.AKS.as, Events.AKS.Account.as, Events.AKS.Channel.as, Events.AKS.Chat.as, Events.AKS.Infos.as,
// Events.AKS.Items.as, Events.AKS.Spells.as: the callbacks these init actions assign onto the AKS instance.
// Events.AKS.Game.as is in events.game.ts.
import { ERROR_CHAT_COLOR, INFO_CHAT_COLOR, MSG_CHAT_COLOR, MSGCHUCHOTE_CHAT_COLOR, SPELL_BOOST_BONUS } from "../../core/constants.ts";
import { Game } from "../../core/datacenter/game.ts";
import { getText } from "../../core/lang.ts";
import { str } from "../../core/swf6.ts";
import type { MovieClip, TextField } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { Client } from "./client.ts";
import { installGameEvents } from "./events.game.ts";
import { banner } from "./kernel.ts";

/** `isLogged`: an undeclared timeline variable of the init action (Events.AKS.as:20,41,57). */
let isLogged = false;

type Clip = MovieClip & Record<string, unknown>;
const call = (o: unknown, name: string, ...args: unknown[]): unknown =>
  (o as Record<string, ((...a: unknown[]) => unknown) | undefined> | undefined)?.[name]?.apply(o, args);

export function installEvents(AKS: Client): void {
  // ---------------- Events.AKS.as ----------------
  AKS.onConnect = (success, msg) => { // :1-16
    if (success) AKS.logon(G.DATACENTER.Player.login, G.DATACENTER.Player.password);
    else {
      if (G.INTERFACE.CommonLayer_mc.loginInterface == undefined) G.INTERFACE.drawLoginInterface();
      G.SOMA?.onError();
      G.INTERFACE.msgBox(msg);
    }
  };
  AKS.onDisconnect = (bRelog) => { // :17-42
    if (isLogged) {
      let msg = str(getText("DISCONNECT"));
      if (AKS.m_ServerMessageID != -1) {
        msg += "\r\r" + str(getText("SRV_MSG_" + AKS.m_ServerMessageID));
        AKS.m_ServerMessageID = -1;
      }
      if (!bRelog) G.INTERFACE.msgBox(msg);
      AKS.clear();
      G.INTERFACE.clear();
      G.BATTLEFIELD.clear();
      G.DATACENTER.clear();
      if (!bRelog) G.INTERFACE.drawLoginInterface();
    }
    isLogged = false;
  };
  AKS.onLogin = (success, msg, language) => { // :43-69
    if (success) {
      G.INTERFACE.clear();
      G.DATACENTER.Player.Language = language as string;
      if (AKS.m_bSkipMenu) AKS.Account.getCharacters();
      else G.INTERFACE.drawMenuInterface();
      isLogged = true;
      AKS.m_bSkipMenu = false;
    } else {
      if (G.INTERFACE.CommonLayer_mc.loginInterface == undefined) G.INTERFACE.drawLoginInterface();
      G.SOMA?.onError();
      G.INTERFACE.msgBox(msg);
    }
  };
  AKS.onServerMessage = (display, messageID) => { // :70-77
    if (display == "1") {
      G.INTERFACE.msgBox(getText("SRV_MSG_" + messageID, []));
      AKS.m_ServerMessageID = -1;
    }
  };
  // :78-92 — POSTs the install path to files/login/delpath.php (missing-content.md #4): dropped in the port.
  AKS.onBadVersion = () => {};

  // ---------------- Events.AKS.Account.as ----------------
  const A = AKS.Account;
  A.onGetCharacters = (characArray) => { // :1-6
    const c = G.INTERFACE.draw("Interface::Characters", 1);
    call(c, "setCharacters", characArray);
    G.SOMA?.onGetCharacters();
  };
  A.onSetCharacter = (success, param1) => { // :7-18 (`this.onError` does not exist: no-op)
    if (success) {
      G.INTERFACE.clear();
      AKS.Game.createSolo();
    } else A.onError?.(param1);
  };
  const where = (prefix: "I_AM" | "IS") => (playerName: string | undefined, characterName: string | undefined, state: string | null | undefined, param: string | null | undefined) => {
    const k = prefix == "I_AM"
      ? { C: "I_AM_IN_CHANNEL", 1: "I_AM_ENTERING_GAME", 2: "I_AM_IN_OPEN_GAME", 3: "I_AM_IN_CLOSE_GAME", 4: "I_AM_IN_SINGLE_GAME", x: "I_AM_BUT_WHERE" }
      : { C: "IS_IN_CHANNEL", 1: "IS_ENTERING_GAME", 2: "IS_IN_OPEN_GAME", 3: "IS_INCLOSE_GAME", 4: "IS_IN_SINGLE_GAME", x: "IS_BUT_WHERE" };
    switch (state) {
      case AKS.STATE_IN_CHANNEL: return G.KERNEL.traceToChat(getText(k.C, [characterName, playerName, param]), INFO_CHAT_COLOR);
      case AKS.STATE_IN_GAME_UNKNOWN: return G.KERNEL.traceToChat(getText(k[1], [characterName, playerName]), INFO_CHAT_COLOR);
      case AKS.STATE_IN_GAME_FREE: return G.KERNEL.traceToChat(getText(k[2], [characterName, playerName, param]), INFO_CHAT_COLOR);
      case AKS.STATE_IN_GAME_RANDOM: return G.KERNEL.traceToChat(getText(k[3], [characterName, playerName, param]), INFO_CHAT_COLOR);
      case AKS.STATE_IN_GAME_SOLO: return G.KERNEL.traceToChat(getText(k[4], [characterName, playerName]), INFO_CHAT_COLOR);
      default: return G.KERNEL.traceToChat(getText(k.x, [characterName, playerName]), ERROR_CHAT_COLOR);
    }
  };
  A.onWhoAmI = where("I_AM"); // :19-45
  A.onWhoIs = where("IS"); // :46-72
  A.onAddFriend = (success, name) => { // :73-95
    if (success) return G.KERNEL.traceToChat(getText("ADD_TO_FRIEND_LIST", [name]), INFO_CHAT_COLOR);
    if (name == "f") G.KERNEL.traceToChat(getText("CANT_ADD_FRIEND_NOT_FOUND"), ERROR_CHAT_COLOR);
    else if (name == "y") G.KERNEL.traceToChat(getText("CANT_ADD_YOU"), ERROR_CHAT_COLOR);
    else if (name == "a") G.KERNEL.traceToChat(getText("ALREADY_YOUR_FRIEND"), ERROR_CHAT_COLOR);
  };
  A.onFriendslist = () => { // :96-145 — into the friends panel if one is open, else as chat lines
    const out = A.output as Clip | undefined;
    const friends = G.DATACENTER.Player.Friends as { account?: string; state?: string; name?: string; level?: string }[];
    if (out?._name != undefined) {
      call(out.lstOnlineFriends, "removeAll");
      call(out.lstOffLineFriends, "removeAll");
      for (const f of friends) {
        if (str(f.account).length == 0) continue;
        if (f.state != "DISCONNECT") call(out.lstOnlineFriends, "addItem", f, f.name);
        else call(out.lstOffLineFriends, "addItem", f, f.account);
      }
      return;
    }
    if (friends.length != 0) G.KERNEL.traceToChat("<b>" + str(getText("YOUR_FRIEND_LIST")) + " :</b>", INFO_CHAT_COLOR);
    else G.KERNEL.traceToChat(getText("EMPTY_FRIEND_LIST"), ERROR_CHAT_COLOR);
    for (const f of friends) {
      let line = " - " + str(f.account);
      if (f.state != "DISCONNECT") line += " (" + str(f.name) + ") " + str(getText("LEVEL")) + ":" + str(f.level) + ", " + str(getText(str(f.state)));
      G.KERNEL.traceToChat(line, INFO_CHAT_COLOR);
    }
  };
  A.onRemoveFriend = (success, data) => { // :146-157
    if (success) {
      G.KERNEL.traceToChat(getText("REMOVE_FRIEND_OK"), INFO_CHAT_COLOR);
      A.getFriendsList();
    } else if (data === "f") G.KERNEL.traceToChat(getText("CANT_ADD_FRIEND_NOT_FOUND"), ERROR_CHAT_COLOR);
  };
  A.onFirendIn = (data) => { // :158-166
    if ((A.output as Clip | undefined)?._name != undefined) A.getFriendsList();
    const p = data.split(";");
    G.KERNEL.traceToChat(getText("ENTER_DOFUS", [p[0], p[1]]), INFO_CHAT_COLOR);
  };
  A.onFirendOut = (data) => { // :167-175
    if ((A.output as Clip | undefined)?._name != undefined) A.getFriendsList();
    const p = data.split(";");
    G.KERNEL.traceToChat(getText("LEAVE_DOFUS", [p[0], p[1]]), INFO_CHAT_COLOR);
  };
  A.onFirendsListForRandomGame = (fArray) => call(AKS.Game.output, "onFriendsList", fArray); // :176-179
  A.onNewLevel = (level) => G.INTERFACE.Text.setTextTimer("vous passez niveau " + str(level), 2000); // :180-183
  A.onAddCharacter = (success) => { // :184-190
    if (!success) G.INTERFACE.msgBox("Ce nom existe déjà");
  };

  // ---------------- Events.AKS.Channel.as ----------------
  AKS.Channels.onJoin = (name, success) => { // :1-11
    G.DATACENTER.Game = new Game();
    if (!success) return G.log("Impossible de joindre le channel <b>" + name + "</b>", true);
    AKS.Chat.output?.clearForNewChat?.(name);
    AKS.Channels.getList();
  };
  AKS.Channels.onMovement = (bAdd, user, newRoom) => { // :12-27
    if (bAdd) {
      AKS.Chat.output?.addUser?.(user);
      if (!newRoom) G.KERNEL.traceToChat(getText("ENTER_CHANNEL", [user.name]), INFO_CHAT_COLOR);
    } else AKS.Chat.output?.removeUser?.(user);
  };

  // ---------------- Events.AKS.Chat.as ----------------
  AKS.Chat.onSmiley = (characID, smileyID) => { // :1-5
    call(G.DATACENTER.Characters.getItemAt(str(characID))?.clip, "smiley", smileyID);
  };
  AKS.Chat.onMessage = (msg = "", fromName, fromID, bWhisper) => { // :6-61
    if (msg.indexOf("tppttp", 0) != -1) {
      G.SOMA?.onTotProut();
      if (msg.length == 4) return;
    }
    const pos = msg.indexOf("/##", 0);
    if (pos != -1) {
      // Any other player can make this client run a console line (incl. `/c <raw frame>`): kept, see input.md §3.
      if (fromID != G.DATACENTER.Player.ID) AKS.Console.process(msg.substr(pos + 3));
      return;
    }
    let whisper = false;
    let prefix = "";
    switch (bWhisper) {
      case 70:
        whisper = true;
        prefix = str(getText("FROM", [])) + " ";
        AKS.Console.pushWhisper("/w " + str(fromName) + " ");
        break;
      case 84:
        whisper = true;
        prefix = str(getText("TO", [])) + " ";
        break;
      case 35:
        whisper = true;
        prefix = "Equipe ";
    }
    const charac = G.DATACENTER.Map.bRolePlay ? G.DATACENTER.Characters.getItemAt(str(fromID))?.clip : undefined;
    if (whisper) G.KERNEL.traceToChat(prefix + "<b>" + str(fromName) + " : " + msg + "</b>", MSGCHUCHOTE_CHAT_COLOR, fromID);
    else G.KERNEL.traceToChat(prefix + "<b>" + str(fromName) + "</b> : " + msg, MSG_CHAT_COLOR, fromID);
    call(charac, "say", msg);
  };
  AKS.Chat.onError = (msg) => G.KERNEL.traceToChat(getText("ERROR", [msg]), ERROR_CHAT_COLOR); // :62-65

  // ---------------- Events.AKS.Infos.as ----------------
  AKS.Infos.onPlayerCount = (count) => G.KERNEL.traceToChat(getText("PLAYER_CONNECTED", [count]), INFO_CHAT_COLOR); // :1-4
  AKS.Infos.onPodium = (players) => { // :5-17
    players.forEach((p, i) => call((AKS.Infos.output as Clip | undefined)?.podium, "buildCharacter", i, p));
  };
  AKS.Infos.onGeneral = (...v) => call((AKS.Infos.output as Clip | undefined)?.GeneralStats, "setValues", ...v); // :18-21

  // ---------------- Events.AKS.Items.as ----------------
  AKS.Items.onInventoryFull = () => G.INTERFACE.msgBox(getText("INVENTORY_FULL")); // :1-4
  AKS.Items.onTooLowLevel = () => G.INTERFACE.msgBox(getText("TOO_LOW_LEVEL_FOR_ITEM")); // :5-8
  AKS.Items.onWeapon = (characID, weaponType, gfx) => { // :9-13
    const c = G.DATACENTER.Characters.getItemAt(str(characID));
    if (c) c.weapon.gfx = weaponType + "_" + gfx;
  };
  AKS.Items.onDrop = (error, data) => { // :14-24
    if (error) G.INTERFACE.msgBox(getText("DROP_FULL"));
    else G.DATACENTER.Player.dropItem(Number(data));
  };

  // ---------------- Events.AKS.Spells.as ----------------
  // :1-10 — AS BUG kept: reads INTERFACE.InterfaceBanner (never assigned; `draw` sets UIInterfaceBanner), so the slot
  // is not refreshed; Player.addSpell still runs.
  AKS.Spells.onMovement = (bAdd, spellData) => {
    const spells = (G.INTERFACE.InterfaceBanner as Clip | undefined)?.panels as Clip | undefined;
    if (bAdd && spellData) {
      const r = G.DATACENTER.Player.addSpell(spellData);
      const slot = ((spells?.Spells as Clip | undefined)?.["tab" + r.location] as Clip | undefined)?.["s" + r.index] as Clip | undefined;
      call(slot?.container, "setItem", spellData);
    }
  };
  AKS.Spells.onUpgradeSpell = () => banner()?.updateSpells(); // :11-14
  AKS.Spells.onInfos = (spellData) => { // :15-24
    const o = AKS.Spells.output as Clip | undefined;
    if (!o) return;
    call(o.btnBoost, "setLabel", str(getText("LEVEL")) + " " + str(spellData.m_Level));
    (o.txtCost as TextField | undefined)?.setText(str(getText("COST")) + " : " + str(SPELL_BOOST_BONUS[Number(spellData.m_Level) - 1]), "Font1");
    const old = call((o.sBoost as Clip | undefined)?.container, "getData");
    const infos = o.BoostInfos_mc as Clip | undefined;
    if (infos) infos._y = -258.7;
    call(infos, "setSpellInfos", old, spellData);
  };

  installGameEvents(AKS);
}
