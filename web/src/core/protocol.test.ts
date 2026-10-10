import { expect, test } from "bun:test";
import { Console } from "./console.ts";
import { setLangData } from "./lang.ts";
import * as P from "./protocol.ts";
import { parseServerMessage as parse } from "./protocol.ts";

test("parser: one sample per DataProcessor branch", () => {
  const cases: [string, object | null][] = [
    ["Habcdef", { type: "helloKey", key: "abcdef" }],
    ["M142", { type: "serverMessage", display: "1", messageId: "42" }],
    ["mL12|13", { type: "mapsList", maps: ["12", "13"] }],
    ["IC57", { type: "playerCount", count: "57" }],
    ["IPa;Bob;1;0;10;ff;-1;0;99;3", { type: "podium", players: [{ account: "a", name: "Bob", guild: "1", xp: "99", level: "3", file: "clips/sprites/10.swf" }] }],
    ["IG10|1|2|3|4", { type: "generalInfos", playerCount: "10", gameCountSolo: "1", gameCountFree: "2", gameCountRandom: "3", waitingCount: "4" }],
    ["IX", null],
    ["SI12|2|4|5", { type: "spellInfos", spell: { m_ID: "12", m_Level: "2", m_APCost: "4", m_Range: "5" } }],
    ["SM|+12~1~~0A|-13||+14~1", { type: "spellsMovement", entries: [{ add: true, spell: { m_ID: "12", m_Type: "A" } }, { add: false, spell: null }] }],
    ["SUK12~2", { type: "spellUpgrade", spell: { m_ID: "12", m_Level: 2 } }],
    ["SUE", null],
    ["AlKfr", { type: "loginOk", language: "fr" }],
    ["AlEa", { type: "loginError", reason: "alreadyLogged" }],
    ["AlEv", { type: "loginError", reason: "badVersion" }],
    ["AlEx", { type: "loginError", reason: "accessDenied" }],
    ["AW|nobody", { type: "whoIs", playerName: "nobody", characterName: "!", state: null }],
    ["AW|acc|Bob|C|chan|", { type: "whoIs", playerName: "acc", characterName: "Bob", state: "C", param: "chan" }],
    ["AW|a|b", null],
    ["ALK|7;Bob;3;1;0;10;ff0000;-1;0|8;Al", { type: "charactersList", characters: [
      { id: 7, name: "Bob", level: "3", model: "1", sex: "0", gfxID: "10", color1: 0xff0000, color2: "-1", color3: 0, file: "clips/sprites/10.swf" },
      { id: 8, name: "Al", file: "clips/sprites/.swf" }] }],
    ["ALE", null],
    ["ASE", { type: "characterSelectError", message: "Erreur lors de la sélection du personnage" }],
    ["ASK|1|2", { type: "characterSelectError", message: "Retour bizarre lors de la sélection du personnage" }],
    ["AN5|100|150|200|5", { type: "newLevel", level: "5", XPlow: "100", XP: "150", XPhigh: "200", bonusPoints: "5" }],
    ["ABK7|0;50|10;3", { type: "boost", characterId: "7", stats: [{ id: "0", value: "50" }, { id: "10", value: "3" }] }],
    ["AAK", { type: "characterAdded", success: true }],
    ["AAE", { type: "characterAdded", success: false }],
    ["CJKgeneral", { type: "channelJoin", name: "general", success: true }],
    ["CM|+Bob;3;10|-Al", { type: "channelMovement", entries: [{ add: true, name: "Bob", level: "3", gfxID: "10" }, { add: false, name: "Al" }] }],
    ["CLK|Bob;3;10", { type: "channelList", users: [{ name: "Bob", level: "3", gfxID: "10" }] }],
    ["GCK|2|myGame|507|BB|", { type: "gameCreate", success: true, state: 2, name: "myGame", params: ["507", "BB", ""] }],
    ["GCEn", { type: "gameCreate", success: false, error: "n" }],
    ["GJK|3|g", { type: "gameJoin", success: true, state: 3, name: "g", params: [] }],
    ["GJEf", { type: "gameJoin", success: false, error: "f" }],
    ["GE7|2;7;5;0;100;50;300;20;15|1;8;4;1;0;0;100;0;0", { type: "gameEnd", senderId: "7", results: [
      { winner: true, id: "7", level: 5, bDead: false, lowXp: 100, xp: 50, fullxp: 150, highXp: 300, winxp: 20, gold: 15 },
      { winner: false, id: "8", bDead: true }] }],
    // "D" = 4, "B" = 2: maxPlayersCount uses charCodeAt(0) twice (AS quirk) → 8; players = charCodeAt(2) - 64
    ["GL|game1;DxB", { type: "gamesList", games: [{ name: "game1", maxPlayersCount: 8, playersCount: 2 }] }],
    ["GL", { type: "gamesList", games: [] }],
    ["GIM|2|g|507|DB", { type: "mapInformations", state: 2, maxPlayerCount: 6, gameName: "g", gameMap: "507", gameOptions: "DB" }],
    ["GIP|7;Bob;1;a;b;c;50;6;3;x;y;0", { type: "playersInformations", players: [{ id: "7", name: "Bob", guild: "1", LP: "50", AP: "6", GP: "3", team: "0" }] }],
    ["GIC|7;120|8;121", { type: "playersCoordinates", data: [["7", "120"], ["8", "121"]] }],
    ["GIX", null],
    ["GM|+0", { type: "gameMovement", entries: [{ add: true, num: 0 }] }],
    ["GV", { type: "gameLeave" }],
    ["GDM|507|9|12|1|0|bhGaeaaaaa", { type: "mapData", id: "507", width: "9", height: "12", bRolePlay: true, backgroundNum: "0", mapData: "bhGaeaaaaa" }],
    ["GDC120|HhGieaaaaa0800", { type: "cellData", cellNum: 120, data: "HhGieaaaaa", mask: "0800" }],
    ["GAS7", { type: "actionsStart", characterId: "7" }],
    ["GAF7", { type: "actionsFinish", characterId: "7" }],
    ["GA12;1;7;qyaD", { type: "gameAction", action: ["12", "1", "7", "qyaD"], id: "12", actionType: 1, characterId: "7", params: "qyaD" }],
    ["GPS120|121", { type: "positionStart", cells: ["120", "121"] }],
    ["GPX", null],
    ["GR", { type: "everybodyIsReady" }],
    ["GS", { type: "startToPlay" }],
    ["Gs", { type: "startSearch" }],
    ["GTS7|30000", { type: "turnStart", characterId: "7", duration: 30 }],
    ["GTF7", { type: "turnFinish", characterId: "7" }],
    ["GTL|7|8", { type: "turnList", turnSequence: ["7", "8"] }],
    ["GtK7|1", { type: "changeTeam", success: true, playerId: "7", team: "1" }],
    ["GtK7", { type: "changeTeam", success: false }],
    ["GiF7|Bob", { type: "invitationRejected", why: "F", whoId: "7", whoName: "Bob" }],
    ["GY7|Bob", { type: "invitation", characterId: "7", characterName: "Bob" }],
    ["Gy", { type: "cancelInvitationResponse" }],
    ["cMKF|7|Bob|hello", { type: "chatMessage", msg: "hello", fromName: "Bob", fromID: "7", channel: 70 }],
    ["cMES", { type: "chatError", error: "syntax" }],
    ["cMEfBob", { type: "chatError", error: "userNotConnected", name: "Bob" }],
    ["cS7|3", { type: "smiley", characterId: "7", smileyId: "3" }],
    ["FAKacc;C;Bob;3;1;0;10", { type: "friendAdd", success: true, name: "acc", friend: { account: "acc", state: "IN_CHANNEL", name: "Bob" } }],
    ["FAKacc", { type: "friendAdd", success: true, friend: { account: "acc", state: "DISCONNECT" } }],
    ["FAEf", { type: "friendAdd", success: false, name: "f", friend: null }],
    ["FDK", { type: "friendRemove", success: true }],
    ["FDEf", { type: "friendRemove", success: false, error: "f" }],
    ["FLKa;2;A;1|b|", { type: "friendsList", friends: [{ account: "a", state: "IN_MULTI" }, { account: "b", state: "DISCONNECT" }] }],
    ["FlKBob;7;3|x", { type: "friendsListForRandomGame", friends: [{ name: "Bob", id: "7", level: "3" }] }],
    ["FIacc;Bob", { type: "friendIn", data: "acc;Bob" }],
    ["FOacc;Bob", { type: "friendOut", data: "acc;Bob" }],
    // "c" falls through into the "F" switch (P-code: every "c" branch jumps to the "F" block)
    ["cAKacc", { type: "friendAdd", success: true, name: "acc" }],
    ["cIacc;Bob", { type: "friendIn", data: "acc;Bob" }],
    ["cX", null],
    ["RCKx", { type: "randomGameCreate", success: true, data: "x" }],
    ["RIx", { type: "randomGameInvite", data: "x" }],
    ["RRKx", { type: "randomGameRefuseInvitation", success: true, data: "Kx" }], // substring(2) on success (AS)
    ["RREx", { type: "randomGameRefuseInvitation", success: false, data: "x" }],
    ["RAx", { type: "randomGameAcceptInvitation", data: "x" }],
    ["RJKx", { type: "randomGameJoin", data: "x" }],
    ["OW7|1a|2|ff", { type: "itemWeapon", characterId: "7", weaponType: 26, gfx: 2, col: "ff" }],
    ["ODK26", { type: "itemDrop", error: false, data: "26" }],
    ["OAEF", { type: "itemAddError", reason: "inventoryFull" }],
    ["OAEL", { type: "itemAddError", reason: "tooLowLevel" }],
    ["OAEZ", null],
    ["OF", null],
    ["Z", null],
    ["", null],
  ];
  for (const [msg, expected] of cases) {
    const ev = parse(msg);
    if (expected === null) expect(ev, msg).toBeNull();
    else expect(ev, msg).toMatchObject(expected);
  }
});

test("AW: whoAmI when the player name is the client's login", () => {
  expect(parse("AW|acc|Bob|2|g|", { login: "acc" })?.type).toBe("whoAmI");
});

test("GM: fields 10-12 depend on isMultiplayer; removals always use the first entry's id (AS bug)", () => {
  const add = "GM|+7;Bob;3;1;0;10;a;b;c;;120;2;9";
  expect(parse(add, { isMultiplayer: false })).toMatchObject({ entries: [{ id: "7", cell: "120", dir: "2" }] });
  expect(parse(add, { isMultiplayer: true })).toMatchObject({ entries: [{ id: "7", LP: "120", team: "2", joinPosition: "9" }] });
  expect(parse("GM|-7|-8")).toEqual({ type: "gameMovement", entries: [{ add: false, id: "7" }, { add: false, id: "7" }] });
});

test("OA: after an O segment the outer index continues from the inner one (AS `var i` bug)", () => {
  // "O" with 2 items → i = 2, then i++ = 3: the G segment at index 1 is skipped
  const ev = parse("OAKO1a~2~3~ff8000~~b;1b~2~3~000000~1~*G50*G60*G70");
  expect(ev).toMatchObject({ type: "itemAdd", entries: [{ kind: "items", items: [{ m_ID: 26 }, { m_ID: 27, m_Position: 1 }] }, { kind: "gold", amount: "70" }] });
  expect(parse("OAKG5*X")).toMatchObject({ entries: [{ kind: "gold", amount: "5" }, { kind: "other" }] });
});

test("builders: exact wire strings", () => {
  expect(P.version()).toBe("5\n");
  expect(P.login("acc", "ab", "A".repeat(32))).toBe("acc\nlglg\n");
  expect(P.addCharacter("Bob", 1, "ff", "-1", "0", 1)).toBe("PABob|1|1|ff|-1|0\n");
  expect(P.deleteCharacter("")).toBeNull();
  expect(P.addFriend("*")).toBeNull();
  expect(P.removeFriend("Al")).toBe("FDAl\n");
  expect(P.joinChannel("a<b>|c")).toBe("CJa_b__c\n");
  expect(P.joinChannel()).toBe("CJ\n");
  expect(P.joinChannel(undefined, "old")).toBe("CJold\n");
  expect(P.chatMessage("<b>x|y", "*")).toBe("BM*|&lt;b&gt;x y\n");
  expect(P.createFreeGame("g", 507, "BB", "pw")).toBe("GC2g|507|BB|pw\n");
  expect(P.createSoloGame()).toBe("GC1\n");
  expect(P.createRandomGame()).toBe("GC3\n");
  expect(P.joinGame(2, "g", "")).toBe("GJ2g|\n");
  expect(P.sendActions(1, ["qyaD"])).toBe("GA001qyaD\n");
  expect(P.sendActions(300, [12, 120])).toBe("GA30012;120\n");
  expect(P.leaveGame()).toBe("GQ\n");
  expect(P.actionAck(5)).toBe("GKK5\n");
  expect(P.actionCancel(undefined, 120)).toBe("GKE|120\n");
  expect(P.itemMovement(26, 1)).toBe("OM26|1\n");
  expect(P.spellMoveToUsed(12, 2)).toBe("SM12|2\n");
});

test("builders: MAX_DATA_LENGTH truncation applies after the \\n (long messages lose it)", () => {
  const out = P.chatMessage("x".repeat(300), "*");
  expect(out).toHaveLength(200);
  expect(out.endsWith("\n")).toBe(false);
  expect(P.chatMessage("x".repeat(195), "*")).toBe("BM*|" + "x".repeat(195) + "\n"); // exactly 200
});

test("Console.process", () => {
  setLangData({ SYNTAX_ERROR: "Syntax:%1", NAME: "name", MSG: "msg", UNKNOW_COMMAND: "?%1", CANT_WISP_YOURSELF: "self" });
  const c = new Console();
  expect(c.process("hello")).toEqual([{ type: "send", data: "BM*|hello\n" }]);
  expect(c.process("/w Bob hi there")).toEqual([{ type: "send", data: "BMBob|hi there\n" }]);
  expect(c.getWhisperHistoryUp()).toBe("/w Bob ");
  expect(c.process("/w Bob hi", "Bob")).toEqual([{ type: "chat", text: "self", color: "FF9900" }]);
  expect(c.process("/w Bob")).toEqual([{ type: "chat", text: "Syntax: /w &lt;name&gt; &lt;msg&gt;", color: "FF9900" }]);
  expect(c.process("/t gg")).toEqual([{ type: "send", data: "BM#|gg\n" }]);
  expect(c.process("/c XY")).toEqual([{ type: "send", data: "XY\n" }]);
  expect(c.process("/count")).toEqual([{ type: "send", data: "IC\n" }]);
  expect(c.process("/join  a")).toEqual([{ type: "send", data: "CJ a\n" }]);
  expect(c.process("/whois Al")).toEqual([{ type: "send", data: "BWAl\n" }]);
  expect(c.process("/f A")).toEqual([{ type: "chat", text: "Syntax: /f &lt;A/D/L&gt; &lt;name&gt;", color: "FF9900" }]); // String(undefined) = ""
  expect(c.process("/f + Al")).toEqual([{ type: "send", data: "FAAl\n" }]);
  expect(c.process("/f l")).toEqual([{ type: "send", data: "FL\n" }]);
  expect(c.process("/ver")).toEqual([{ type: "chat", text: "DOFUS v5", color: "66FF00" }]);
  expect(c.process("/nope x")).toEqual([{ type: "chat", text: "?NOPE", color: "FF9900" }]);
  expect(c.getHistoryUp()).toBe("/nope x");
  setLangData({});
});
