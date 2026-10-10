// AKSClient/Events.AKS.Game.as: the AKS.Game callbacks — solo/multiplayer game creation, lobby movements,
// placement, turns, game end, and the game-action switch (`onActions`, :495-838) that queues every visible
// reaction on the actor's SEQUENCER_actions (docs/logic/sequencer.md §4).
import { INFO_CHAT_COLOR, ERROR_CHAT_COLOR } from "../../core/constants.ts";
import type { Character } from "../../core/datacenter/character.ts";
import { Game } from "../../core/datacenter/game.ts";
import { Spell } from "../../core/datacenter/spell.ts";
import { SpellLaunch } from "../../core/datacenter/spellLaunch.ts";
import { getMapText, getSpellText, getText } from "../../core/lang.ts";
import { str, toNumber } from "../../core/swf6.ts";
import { type MovieClip, player, type TextField } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { CharacterData } from "../battlefield/deps.ts";
import type { Client } from "./client.ts";
import { banner } from "./kernel.ts";
import type { Fn } from "./sequencer.ts";

type Clip = MovieClip & Record<string, unknown>;
/** BattleField.Characters.Character (owner A): the members the game events call. */
type CharClip = {
  setPosition(cell: unknown, dir?: unknown, b?: boolean): void;
  moveCharacterThroughPath(path: number[], bMulti: boolean): void;
  stopMove(): void;
  slide(seq: unknown, cell: unknown): void;
  die(seq: unknown): void;
  setAnim(anim: string): void;
  cast(type: number, spell: Spell, cells: { cellFrom: number; cellTo: number }): void;
  getCellNum(): number;
  shoot(cell: unknown): void;
  say(text: string): void;
  clear(): void;
};
const clipOf = (c: Character | undefined): CharClip | undefined => (c?.clip ?? undefined) as CharClip | undefined;
const charAt = (id: unknown): Character | undefined => G.DATACENTER.Characters.getItemAt(str(id));
const call = (o: unknown, name: string, ...args: unknown[]): unknown =>
  (o as Record<string, ((...a: unknown[]) => unknown) | undefined> | undefined)?.[name]?.apply(o, args);
/** `DOFUS.onEnterFrame = function(){ AKS.Game.GetMapData(); delete this.onEnterFrame; }` (:7-11, :333-337, :521-525). */
const nextFrameGetMapData = () => {
  G.DOFUS.onEnterFrame = function (this: Clip) {
    G.AKS.Game.GetMapData();
    delete this.onEnterFrame;
  };
};
/** Dofus.DataCenter.Character.as:218-234: core updateAP is the data half; the "next turn" box is the UI half. */
function updateAP(this: Character, dAP: unknown): void {
  this.updateAP(dAP as number);
  if (this.num == (G.DATACENTER.Player.ID as unknown) && G.DATACENTER.Player.noMoreAP) G.INTERFACE.messageNextTurn();
}
const chat = (key: string, params: unknown[] = []) => [getText(key, params), INFO_CHAT_COLOR];

export function installGameEvents(AKS: Client): void {
  const Gm = AKS.Game;
  const out = () => Gm.output as Clip | undefined;

  Gm.onCreateSolo = () => { // :1-13
    G.log("onCreateSolo:" + player.time);
    G.INTERFACE.clear();
    G.KERNEL.drawPlayerInterface();
    G.KERNEL.PathFinding.setInitState(false);
    nextFrameGetMapData();
    G.SOMA?.onEnterVillage();
  };
  Gm.onMapData = (id, width, height, bRolePlay, backgroundID, data) => { // :14-20
    G.log("onMapData" + player.time);
    G.KERNEL.Compressor.uncompressMap(Number(id), getMapText(str(id)).n, width, height, bRolePlay, backgroundID, data);
    G.KERNEL.drawCurrentMap();
  };
  Gm.onCellData = (cellNum, compressData, mask) => { // :21-25 (`BATTLEFIELD.MAP`, SWF 6 case-insensitive)
    G.KERNEL.Compressor.uncompressCell(cellNum, compressData, mask);
    G.BATTLEFIELD.Map.updateCell(cellNum);
  };
  Gm.onMapsList = (list) => { // :26-40
    const lst = out()?.comboMaps;
    call(lst, "removeAll");
    for (const m of list) call(lst, "addItem", getMapText(m).n, m);
    call(lst, "setSelectedIndex", 0);
  };
  Gm.onList = (games) => { // :41-53
    const lst = out()?.comboGames;
    call(lst, "removeAll");
    for (const g of games) call(lst, "addItem", str(g.name) + " (" + g.playersCount + " / " + g.maxPlayersCount + ")", g.name);
    call(lst, "setSelectedIndex", 0);
  };
  Gm.onCreateMulti = (success, params) => { // :54-64
    if (success) Gm.onJoin?.(success, params, true);
    else G.KERNEL.traceToChat(str(getText("ERROR_CREATING_GAME", [])) + " : " + str(getText("ERROR_CREATING_" + str(params), [])), ERROR_CHAT_COLOR);
  };
  Gm.onJoin = (success, params, bCreator) => { // :65-102 — the "game joined" tab with one empty slot per player
    if (!success) {
      G.KERNEL.traceToChat(str(getText("ERROR_JOINING_GAME", [])) + " : " + str(getText("ERROR_JOINING_" + str(params), [])), ERROR_CHAT_COLOR);
      return;
    }
    const p = params as string[];
    G.DATACENTER.Game.bYouAreCreator = !!bCreator;
    call(out()?._parent, "showLayer", "TabGameJoined");
    const o = out(); // TabGameJoined's onFocus (S309 frame 1) has just rebound AKS.Game.output; the AS reads it again
    if (o?.btnPlay) (o.btnPlay as MovieClip)._visible = !!bCreator;
    const opt = str(p[1]);
    const options = opt.charCodeAt(0) - 64 + " " + str(getText("VERSUS", [])) + " " + (opt.charCodeAt(1) - 64);
    (o?.txtGameName as TextField | undefined)?.setText(G.DATACENTER.Game.m_name);
    (o?.txtGameMap as TextField | undefined)?.setText(getMapText(str(p[0])).n);
    (o?.txtGameOptions as TextField | undefined)?.setText(options);
    call(o?.MapImage, "loadMapImage", p[0]);
    (o?.txtPasswordValue as TextField | undefined)?.setText(Gm.tmpPassword);
    const players = o?.players as Clip | undefined;
    for (let i = 0; i < toNumber(G.DATACENTER.Game.m_maxPlayerCount); i++) {
      const j = players?.attachMovie("TabGameJoined_PlayerEmpty", "player" + i, i + 10);
      if (j) j._y = 16 * i;
    }
    AKS.Chat.output?.clearForNewChat?.();
  };
  Gm.onJoinRandom = (bCreator) => { // :103-112
    G.DATACENTER.Game.bYouAreCreator = bCreator;
    if (bCreator && out()?.teamMateChoose) (out()!.teamMateChoose as MovieClip)._visible = true;
    AKS.Chat.output?.clearForNewChat?.();
    call(out()?._parent, "showLayer", "TabPlayDofus", true, true);
  };
  Gm.onMovement = (badd, c) => { // :113-228
    const DC = G.DATACENTER;
    const characData = c as (Character & { num: number }) | undefined;
    if (!DC.Game.isMultiplayer) { // solo: the village sprites
      if (badd) (G.BATTLEFIELD.Characters.build(characData as CharacterData) as CharClip | undefined)?.setPosition(characData?.cell, characData?.dir);
      else clipOf(characData)?.clear();
      return;
    }
    DC.Game.m_playerCount = toNumber(DC.Game.m_playerCount) + (badd ? 1 : -1);
    if (badd) DC.Game.players.setItemAt(toNumber(characData?.num), characData);
    else DC.Game.players.deleteItemAt(toNumber(characData?.num));
    if (DC.Game.isRunning) {
      if (!badd) {
        G.KERNEL.traceToChat(getText("LEAVE_GAME", [characData?.name]), INFO_CHAT_COLOR);
        if (!DC.Game.bInSearch) clipOf(characData)?.die(characData?.SEQUENCER_actions);
      }
      return;
    }
    const pos = characData?.joinPosition;
    const players = out()?.players as Clip | undefined;
    if (badd) {
      if (DC.Game.isRandom) {
        if (!DC.Game.bInSearch) call(out(), "onValidateInvitation", characData?.num);
      } else {
        (players?.["player" + pos] as MovieClip | undefined)?.removeMovieClip();
        const joueur = players?.attachMovie("TabGameJoined_Player", "player" + pos, toNumber(pos) + 10, { bCreator: DC.Game.bYouAreCreator, playerID: characData?.num }) as Clip | undefined;
        if (joueur) {
          joueur._y = 16 * toNumber(pos);
          joueur.onEnterFrame = function (this: Clip) {
            if (characData?.num == (G.DATACENTER.Player.ID as unknown)) {
              const r0 = this.radioTeam0 as Clip | undefined, r1 = this.radioTeam1 as Clip | undefined;
              if (r0) r0.onClick = function (this: Clip) { if (!this.bSelected) G.AKS.Game.changeTeam(0); };
              call(r0, "setEnabled", true);
              if (r1) r1.onClick = function (this: Clip) { if (!this.bSelected) G.AKS.Game.changeTeam(1); };
              call(r1, "setEnabled", true);
            }
            call(joueur, "setPlayerName", characData?.name);
            call(joueur, "setPlayerGuild", characData?.guildName);
            call(joueur, "setPlayerLevel", characData?.level);
            call(joueur, "setPlayerTeam", characData?.team);
            delete this.onEnterFrame;
          };
        }
      }
      if (characData?.num != 0 && !DC.Game.bInSearch) AKS.Chat.output?.addUser?.(characData);
    } else {
      if (DC.Game.isRandom) call(out(), "onRemoveCharacter", characData?.num);
      else {
        const j = players?.attachMovie("TabGameJoined_PlayerEmpty", "player" + pos, toNumber(pos) + 10);
        if (j) j._y = 16 * toNumber(pos);
      }
      if (characData?.num != 0) AKS.Chat.output?.removeUser?.(characData?.name);
    }
  };
  Gm.onLeave = () => { // :229-256
    Gm.onActionsFinish?.(str(G.DATACENTER.Player.ID));
    const DC = G.DATACENTER;
    const { isMultiplayer, isRunning, isRandom } = DC.Game;
    DC.Game = new Game();
    DC.Player.reset();
    if (!isMultiplayer) return;
    if (isRunning) return G.KERNEL.changeToMultiplayer();
    AKS.Channels.join();
    call(out()?._parent, "showLayer", isRandom ? "TabPlayDofusStart" : "TabJoinGame");
  };
  Gm.onInvitation = (characID, characName) => { // :257-269 — AS BUG kept: `SONA.onGameInvitation()` (no sound)
    G.INTERFACE.onQuestionBoxYes = () => G.AKS.Game.join(G.AKS.Game.STATE_RANDOM_TEAM, characID);
    G.INTERFACE.onQuestionBoxNo = () => G.AKS.Game.refuseInvite(str(characID));
    G.INTERFACE.questionBox(getText("DO_U_ACCEPT_INVITATION", [characName]));
  };
  Gm.onCancelInvitationResponse = () => { // :270-275
    delete G.INTERFACE.onQuestionBoxYes;
    delete G.INTERFACE.onQuestionBoxNo;
    G.INTERFACE.hideQuestionBox();
  };
  Gm.onInvitationRejected = (why, whoID, whoName) => { // :276-289
    call(out(), "onRemoveCharacter", whoID);
    if (why == "E") G.KERNEL.traceToChat(getText("IMPOSSIBLE_INVITATION", [whoName]), ERROR_CHAT_COLOR);
    else if (why == "C") G.KERNEL.traceToChat(getText("REFUSE_INVITATION", [whoName]), ERROR_CHAT_COLOR);
  };
  Gm.onPositionStart = (cells) => { // :290-338 — placement cells (2 base-64 digits each), team watcher, map request
    const DC = G.DATACENTER;
    DC.Game.bInSearch = false;
    const decode = (s = "") => {
      const r: number[] = [];
      for (let i = 0; i < s.length; i += 2) r.push((toNumber(G.KERNEL.Compressor.decode64(s.charAt(i))) << 6) + toNumber(G.KERNEL.Compressor.decode64(s.charAt(i + 1))));
      return r;
    };
    (DC.Game as Game & { allowedCells?: number[][] }).allowedCells = [decode(cells[0]), decode(cells[1])];
    DC.Game.m_bRunning = true;
    G.INTERFACE.clear();
    G.KERNEL.drawPlayerInterface();
    const team0: unknown[] = [], team1: unknown[] = [];
    for (const k of Object.keys(DC.Game.players.keys)) {
      const p = DC.Game.players.getItemAt(k) as { team?: unknown } | undefined;
      ((p?.team as unknown) == 0 ? team0 : team1).push(p);
    }
    G.INTERFACE.drawTeamWatcher(team0, team1);
    nextFrameGetMapData();
  };
  Gm.onPlayersCoordinates = (updatedData) => { // :339-365 — builds every sprite; ends the local placement drag
    for (const [id, cell, dir] of updatedData) {
      const clip = G.BATTLEFIELD.Characters.build(charAt(id) as CharacterData) as CharClip | undefined; // AS: build(undefined) too
      if (G.DATACENTER.Game.isMultiplayer && id == G.DATACENTER.Player.ID) player.stopDrag();
      clip?.setPosition(cell, dir);
    }
  };
  Gm.onEnd = (isSender) => { // :366-394 — the result panel is queued after the sender's last animation
    if (isSender == G.DATACENTER.Player.ID) Gm.onActionsFinish?.(str(G.DATACENTER.Player.ID));
    G.DATACENTER.Game.m_bRunning = false;
    const Q = charAt(isSender)?.SEQUENCER_actions;
    if (!Q) return;
    const b = banner(), I = G.INTERFACE, o = Gm.output as (Clip & { stopTimer?(): void }) | undefined;
    Q.addAction(false, b, b?.activateTimeline, [false]);
    Q.addAction(false, o, o?.stopTimer, []);
    Q.addAction(false, I, I.hideTeamWatcher, []);
    Q.addAction(false, I, I.hideToolTip, []);
    Q.addAction(false, I, I.hideMessageNextTurn, []);
    Q.addAction(false, G.SOMA, G.SOMA?.onGameEnd, []);
    Q.addAction(false, G.KERNEL, G.KERNEL.traceToChat, ["Fin de partie", INFO_CHAT_COLOR]);
    Q.addAction(false, b, b?.showExtraPanel, [G.DATACENTER.Game.isRandom ? "GameResultRandom" : "GameResultFree"]);
    if (!Q.isPlaying()) Q.play();
  };
  Gm.onChangeTeam = (bool, item, team) => { // :395-405
    if (bool) call(item, "setPlayerTeam", team);
    else G.KERNEL.traceToChat(getText("CANT_CHANGE_TEAM"), ERROR_CHAT_COLOR);
  };
  Gm.onTurnList = () => banner()?.activateTimeline(true); // :406-409
  Gm.onStartToPlay = () => { // :410-420
    G.SOMA?.onGameStart();
    G.INTERFACE.hideTeamWatcher();
    G.INTERFACE.Text.setTextTimer(getText("GAME_LAUNCH", []), 2000, false, true);
    const BF = G.BATTLEFIELD;
    BF.Selection.unSelectAll();
    BF.Interaction.setType("move");
    BF.Interaction.setEnabled(0);
    BF.Interaction.setLayerVisible(true, 0);
    BF.Interaction.setLayerVisible(false, 1);
  };
  Gm.onStartSearch = () => { // :421-425
    if (out()?.maskSearch) (out()!.maskSearch as MovieClip)._visible = true;
    G.DATACENTER.Game.bInSearch = true;
  };
  Gm.onTurnStart = (characID, duration) => { // :426-442
    const DC = G.DATACENTER;
    const c = charAt(characID);
    banner()?.nextTurnTimeline(characID);
    DC.Game.currentPlayerID = characID ?? null;
    call(Gm.output, "startTimer", duration);
    if (characID == DC.Player.ID) {
      G.BATTLEFIELD.Interaction.setEnabled(3);
      DC.Player.SpellsManager.nextTurn();
    }
    G.KERNEL.cleanPlayer(DC.Game.lastPlayerID);
    const ap = characID != DC.Player.ID ? "" : " (" + str(c?.AP) + str(getText("AP")) + ")";
    G.INTERFACE.Text.setTextTimer(str(getText("PLAYER_TURN", [charAt(characID)?.name])) + ap, 2000, false, true);
    G.BATTLEFIELD.Selection.unSelectAll();
  };
  Gm.onTurnFinish = (characID) => { // :443-454
    const DC = G.DATACENTER;
    if (characID == DC.Player.ID) {
      G.INTERFACE.hideMessageNextTurn();
      G.BATTLEFIELD.Interaction.setEnabled(0);
    }
    DC.Game.lastPlayerID = DC.Game.currentPlayerID;
    DC.Game.currentPlayerID = null;
    call(Gm.output, "stopTimer");
    G.KERNEL.cleanUpGameArea(true);
  };
  Gm.onActionsStart = (characID) => { // :455-473 — map locked while the local player's action block plays
    if (characID != G.DATACENTER.Player.ID) return;
    const d = G.DATACENTER.Player.data;
    if (!d) return;
    d.GameActionsManager.m_bNextAction = true;
    if (G.DATACENTER.Game.isFight) {
      const Q = d.SEQUENCER_actions;
      Q.addAction(false, G.BATTLEFIELD.Interaction, G.BATTLEFIELD.Interaction.setEnabled, [0]);
      if (!Q.isPlaying()) Q.play();
    }
  };
  Gm.onActionsFinish = (characID) => { // :474-494
    if (characID != G.DATACENTER.Player.ID) return;
    const d = G.DATACENTER.Player.data;
    if (!d) return;
    const Q = d.SEQUENCER_actions;
    d.GameActionsManager.m_bNextAction = false;
    d.GameActionsManager.end(true);
    if (G.DATACENTER.Game.isFight) {
      Q.addAction(false, G.KERNEL, G.KERNEL.setEnabledInteractionIfICan, [3]);
      Q.addAction(false, G.KERNEL, G.KERNEL.cleanPlayer, [characID]);
      if (!Q.isPlaying()) Q.play();
    }
  };
  Gm.onActions = onActions; // :495-838
}

/** Events.AKS.Game.as:495-838 — `Action` = `GA` payload split on ";": [id, type, actorID, params]. */
function onActions(Action: string[]): void {
  const DC = G.DATACENTER, K = G.KERNEL, I = G.INTERFACE;
  const [idAction, , actorID, params = ""] = Action;
  const typeAction = Number(Action[1]);
  const actor = charAt(actorID);
  if (!actor) return; // AS: every member of an unknown character is undefined → nothing visible, no ack
  const Q = actor.SEQUENCER_actions;
  const GAM = actor.GameActionsManager;
  GAM.onServerResponse(idAction);
  const add = (waitEnd: boolean, object: unknown, fn: Fn | undefined, p: unknown[] = []) => Q.addAction(waitEnd, object, fn, p);
  const say = (args: unknown[]) => add(false, K, K.traceToChat, args);
  const t = params.split(",");
  const target = charAt(t[0]);
  const effect = (key: string, type: number | null, stat?: "force" | "agility" | "karma" | "charism" | "vitality" | "intelligence", lp?: "LP" | "AP") => {
    say(chat(key, [target?.name, t[1]]));
    if (lp == "LP") add(false, target, target?.updateLP, [t[1]]);
    if (lp == "AP") add(false, target, updateAP, [t[1], false]);
    if (stat) add(false, target, target?.update, [stat, Number(t[1])]);
    if (type != null) add(false, K, K.addToEffectsManager, [target, type, t[1], t[2], t[0] == actorID]);
  };
  switch (typeAction) {
    case 1: { // move
      const clip = clipOf(actor);
      if (actor.SEQUENCER_anim.isPlaying()) clip?.stopMove();
      add(true, clip, clip?.moveCharacterThroughPath, [K.Compressor.extractFullPath(params), DC.Game.isMultiplayer]);
      break;
    }
    case 2: // map change
      I.Text.setText(getText("LOADING_MAP", []), false);
      I.hideAnimSelection();
      I.hideToolTip();
      nextFrameGetMapData();
      break;
    case 3: K.changeToMultiplayer(); break;
    case 4: { // teleport
      const clip = clipOf(target);
      add(false, clip, clip?.setPosition, [t[1], undefined, false]);
      break;
    }
    case 5: { // push / pull
      const clip = clipOf(target);
      add(true, clip, clip?.slide, [Q, t[1]]);
      break;
    }
    case 10: // awards
      for (const award of params.split("*")) {
        const type = award.substring(0, 1), data = award.substr(1);
        if (type == "G") I.msgBox(getText("YOU_FIND_GOLD", [data]));
        else if (type == "O") {
          const item = K.CharactersManager.getItemObjectFromData(data);
          if (item) DC.Player.addItem(item); // AS: addItem(undefined) would push undefined
          I.msgBox(str(getText("YOU_FIND_NEW_ITEM")) + " : " + str(item?.name));
        } else I.msgBox(getText("YOU_FIND_SOMTHING"));
      }
      break;
    case 100: { // life points
      const dLP = Number(t[1]);
      if (dLP != 0) {
        say(chat(dLP >= 0 ? "WIN_LP" : "LOST_LP", [target?.name, dLP]));
        add(false, target, target?.updateLP, [dLP]);
      } else say(chat("NOCHANGE_LP", [target?.name]));
      break;
    }
    case 101:
    case 102: { // action points (102: silent)
      const dAP = Number(t[1]);
      if (dAP == 0) break;
      if (typeAction == 101) say(chat("LOST_AP", [target?.name, dAP]));
      add(false, target, updateAP, [dAP, typeAction == 101]);
      break;
    }
    case 103: { // death. AS BUG kept: `chracData.num` is undefined.
      const c = charAt(params), clip = clipOf(c), b = banner();
      say(chat("DIE", [c?.name]));
      add(false, b, b?.removePlayerTimeline, [undefined]);
      add(true, clip, clip?.die, [Q]);
      break;
    }
    case 104: {
      const clip = clipOf(actor);
      say(chat("CANT_MOVEOUT"));
      add(false, clip, clip?.setAnim, ["hit"]);
      break;
    }
    case 105: say(chat("REDUCE_DAMAGES", [target?.name, t[1]])); break;
    case 106: say([t[1] != "1" ? getText("RETURN_SPELL_NO", [target?.name]) : getText("RETURN_SPELL_OK", [target?.name]), INFO_CHAT_COLOR]); break;
    case 107: say(chat("RETURN_DAMAGES", [target?.name, t[1]])); break;
    case 110: effect("BOOST_LIFE_POINTS", 0, undefined, "LP"); break;
    case 111: effect("BOOST_ACTION_POINTS", 1, undefined, "AP"); break;
    case 112: effect("BOOST_DAMAGES", 16); break;
    case 114: effect("MULTIPLICATE_DAMAGES", 17); break;
    case 115: effect("BOOST_CRITICAL_HIT", 18); break;
    case 117: effect("MODERATE_RANGE", 19); break;
    case 118: effect("MODERATE_STRENGTH", 10, "force"); break;
    case 119: effect("MODERATE_AGILITY", 14, "agility"); break;
    case 120:
      add(false, target, target?.updateLP, [t[1]]);
      if (t[0] == actorID) say(chat("BOOST_FRIEND_LIFE_POINTS", [target?.name, t[1]]));
      break;
    case 121:
      add(false, target, updateAP, [t[1]]);
      if (t[0] == actorID) say(chat("BOOST_FRIEND_ACTION_POINTS", [target?.name, t[1]]));
      break;
    case 122: break; // AS BUG kept: tests tmpArray[0] before assigning it (undefined == actor is false)
    case 123: effect("MODERATE_KARMA", 13, "karma"); break;
    case 124: effect("MODERATE_CHARISM", 12, "charism"); break;
    case 125: effect("MODERATE_VITALITY", 11, "vitality"); break;
    case 126: effect("MODERATE_INTELLIGENCE", 15, "intelligence"); break;
    case 130: say(chat("STEAL_GOLD", [actor.name, t[0]])); break;
    case 150: say(chat("INVISIBILITY", [target?.name])); break;
    case 200: add(false, K, K.ExecuteAnim, [t[0], t[1]]); break;
    case 300: { // spell cast: [spellID, cell, animID, level, launchType, inFront]
      const clip = clipOf(actor);
      const sd = new Spell();
      sd.m_ID = t[0] ?? null;
      sd.m_AnimID = t[2];
      sd.m_Level = t[3];
      sd.m_bInFrontOfPlayer = t[5] == "1";
      say(chat("HAS_LAUNCH_SPELL", [actor.name, getSpellText(sd.m_ID)?.n]));
      add(true, clip, clip?.cast, [Number(t[4]), sd, { cellFrom: clip?.getCellNum(), cellTo: Number(t[1]) }]);
      if (actorID == DC.Player.ID) {
        const characOnID = G.BATTLEFIELD.Map.getData(t[1])?.playerOnID; // `PlayerOnID`, SWF 6 case-insensitive
        DC.Player.SpellsManager.addLaunchedSpell(new SpellLaunch(str(sd.m_ID), characOnID, DC.Player));
      }
      break;
    }
    case 301:
    case 304: { // critical hit (spell / close combat)
      const clip = clipOf(actor);
      add(false, G.SOMA, G.SOMA?.onGameCriticalHit);
      say([" (" + str(getText("CRITICAL_HIT")) + ")", INFO_CHAT_COLOR, true]);
      add(false, clip, clip?.setAnim, ["bonus"]);
      if (typeAction == 301 && actor.num == (DC.Player.ID as unknown)) {
        const b = banner();
        add(false, b, b?.setPlayerHeadAnim, ["smile"]);
      }
      break;
    }
    case 302:
    case 305: { // critical miss (spell / close combat)
      const clip = clipOf(actor);
      add(false, G.SOMA, G.SOMA?.onGameCriticalMiss);
      if (typeAction == 302) say(chat("HAS_LAUNCH_SPELL", [actor.name, getSpellText(params)?.n]));
      else say(chat("HAS_ATTACK_CC", [actor.name]));
      say([" (" + str(getText("CRITICAL_MISS")) + ")", INFO_CHAT_COLOR, true]);
      add(false, clip, clip?.say, ["Je suis trop nul"]);
      break;
    }
    case 303: { // close combat
      const clip = clipOf(actor);
      say(chat("HAS_ATTACK_CC", [actor.name]));
      add(true, clip, clip?.shoot, [params]);
      break;
    }
  }
  // :826-833 — a numeric id from the local player is acknowledged (GKK) after the queued visuals
  if (!Number.isNaN(Number(idAction)) && actorID == DC.Player.ID) add(false, GAM, GAM.ack, [idAction]);
  else GAM.end(actorID == DC.Player.ID);
  if (!Q.isPlaying()) Q.play();
}
