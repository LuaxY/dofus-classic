# Dofus beta 5b — network protocol

Reverse-engineered from the decompiled client only (`decompiled/clean/`, see `docs/BRIEF.md`). Everything a server needs
to talk to the original `AKSClient.swf` (VERSION 5, Flash 6 / ActionScript 1). Paths in citations are relative to
`decompiled/clean/`. Tags: **[code]** read from the AS source (default when a citation is given), **[SWF6 runtime]**
Flash Player behaviour for SWF version 6 (not game code), **[inference]** deduction the client does not enforce.
Anything not determinable from the code is written **UNKNOWN — not in code**.

| File | Content |
|---|---|
| [README.md](README.md) | transport, dispatch, OK/error convention, states, login sequence, diagram, message index |
| [account.md](account.md) | `H`, version/credentials, `Al`, `M`, `BW`/`AW`, `PL`/`AL`, `PS`/`AS`, `PA`/`AA`, `PD`, `PB`/`AB`, `AN` |
| [friends.md](friends.md) | `FL`, `Fl`, `FA`, `FD`, `FI`, `FO` |
| [channel.md](channel.md) | `CJ`, `CL`, `CM` |
| [chat.md](chat.md) | `BM`/`cM`, `BS`/`cS` |
| [console.md](console.md) | console commands → frames |
| [infos.md](infos.md) | `IC`, `IP`, `IG` |
| [items.md](items.md) | item entry format, `OM`, `OD`, `OA`, `OW`, `OF` |
| [spells.md](spells.md) | spell entry format, `SM`, `SB`/`SU`, `SI` |
| [game.md](game.md) | game states, `GC`, `GJ`, `BL`/`m`, `GL`, `GM`, `Gt`, `GS`, invitations, `GQ`/`GV`, `GD`/`GDM`/`GDC`, `GR`, `GPS`, `Gp`, `GIC`, `GIM`, `GIP`, turns, `GE` |
| [game-actions.md](game-actions.md) | `GA` requests/results (all types), `GAS`/`GAF`, `GKK`/`GKE` |
| [misc.md](misc.md) | dead `R` family, ignored codes |
| [encodings.md](encodings.md) | password crypt, base64 alphabet, map data, cell ids, paths, PatternDecoder, real map example |
| [server-checklist.md](server-checklist.md) | ordered minimal server script from connect to a fight |

---

## Transport

- **Socket:** Flash `XMLSocket` (`AKSClient/Dofus.Client.as:21`), TCP, host `server01.dofus.com` (`kam` in DEBUG), port
  **5555** (`AKSClient/Dofus.Kernel.Init.as:6,19,26`). Connection opened by `AKS.connect(SERVER_NAME, SERVER_PORT)`
  (`AKSClient/Dofus.Client.as:44-51`) when the user logs in.
- **Framing:** `XMLSocket` frames are text terminated by one `0x00` byte, in both directions [SWF6 runtime]. Each received
  frame triggers one `onData(string)` → `DataProcessor.process` (`AKSClient/Dofus.Client.as:48`).
- **Client → server:** every message is built as `<code><payload>\n` and passed to `Class_Client.prototype.send`
  (`AKSClient/Dofus.Client.as:75-89`), which **truncates the string to 200 characters** (`MAX_DATA_LENGTH`,
  `AKSClient/Dofus.Kernel.Init.as:41`; `AKSClient/Dofus.Client.as:78-81`) — the `\n` is part of what gets cut. On the wire:
  `<code><payload>\n\0`, or exactly 200 chars + `\0` when truncated. **Frame on `\0` only; strip one trailing `\n` if
  present.** The login payload is the only one with an inner `\n` (`<login>\n<crypt>\n`).
- **Server → client:** one message per frame, no trailing `\n` needed (the dispatcher never strips or splits on `\n`;
  a trailing `\n` would end up inside the last field). No length cap on receive (the `length < 800` test in
  `AKSClient/Dofus.Kernel.Init.as:75` only limits the debug log). Never pack two messages in one frame: dispatch looks only at
  the first chars of the frame.
- **Charset:** the code never sets `System.useCodepage` (grep: no hit), so Flash Player 6 sends and expects **UTF-8**
  [SWF6 runtime]. Client strings are UTF-16 internally; every length/index in this documentation (200-char cap,
  `substr`, `charAt`) counts UTF-16 code units, not bytes. Protocol structure is pure ASCII.
- **Escaping:** none at the transport level. Only chat text (`<`, `>`, `|` → `&lt;`, `&gt;`, space) and channel names
  (`<`, `>`, `|` → `_`) are sanitised by the client ([encodings.md](encodings.md#other-field-encodings)). A `\0` cannot be
  typed into a Flash text field in practice; a `\n` inside user text is not filtered.
- **Disconnect:** `XMLSocket.onClose` → `innerOnDisconnect` → `AKS.onDisconnect` (`AKSClient/Dofus.Client.as:97-106`,
  `AKSClient/Events.AKS.as:17-42`): if logged in, message box `DISCONNECT` (+ `SRV_MSG_<id>` if an `M` notice was
  stored), everything cleared, login screen redrawn. There is no client keep-alive / ping frame.

### Waiting indicator

`send(data, waiting)` opens a spinner unless `waiting === false` (`AKSClient/Dofus.Client.as:85-88`); **any** received frame closes it
(`AKSClient/Dofus.Client.DataProcessor.as:12`). It is cosmetic (no input lock, `modules_Interfaces/Interface.Waiting.as:6-19`)
but a server should answer every spinner-opening request. Requests sent without spinner: `FL`, `Fl`, `OM`, `OD`, `SM`,
`SI`, `Gi`, `GY`, `Gs`, `GKK`, `GKE`, `GT`. All others open it (including `SB`, explicitly `true`).

---

## Dispatch

`DataProcessor.process` (`AKSClient/Dofus.Client.DataProcessor.as:6-493`):

```
rubrique = charCodeAt(0)      action = charCodeAt(1)      codeErreur = (charCodeAt(2) != 75 /* 'K' */)
```

Char codes used by the dispatcher and handlers, translated:

| Code | Char | Where |
|---|---|---|
| 72 | `H` | handshake |
| 77 | `M` | server notice; also 2nd/3rd char `M` (`CM`, `GM`, `SM`, `cM`, `GIM`, `GDM`) |
| 109 | `m` | maps list |
| 73 | `I` | infos rubrique; 2nd char `I` (`SI`, `GI…`, `FI`) |
| 83 | `S` | spells rubrique; `AS`, `GS`, `cS`, `GAS`, `GTS`, `GPS`, chat error `S` |
| 65 | `A` | account rubrique; `AA`, `GA`, `FA`, `OA`, `RA` |
| 67 | `C` | channel rubrique; `IC`, `GC`, `GIC`, `GDC`, `RC` |
| 71 | `G` | game rubrique; `IG` |
| 99 | `c` | chat rubrique |
| 70 | `F` | friends rubrique; `OF`, `GAF`, `GTF`; whisper kind `F` |
| 82 | `R` | random rubrique (dead); `GR`, `RR` |
| 79 | `O` | items rubrique; `FO` |
| 75 | `K` | OK marker (3rd char) |
| 108 | `l` | `Al`, `Fl` |
| 87 | `W` | `AW`, `OW` |
| 76 | `L` | `AL`, `CL`, `GL`, `FL`, `GTL` |
| 78 | `N` | `AN` |
| 66 | `B` | `AB` |
| 74 | `J` | `CJ`, `GJ`, `RJ` |
| 69 | `E` | `GE` |
| 86 | `V` | `GV` |
| 68 | `D` | `GD…`, `FD`, `OD` |
| 80 | `P` | `IP`, `GP…`, `GIP` |
| 85 | `U` | `SU` |
| 84 | `T` | `GT…`; whisper kind `T` |
| 115 | `s` | `Gs` |
| 116 | `t` | `Gt` |
| 105 | `i` | `Gi` |
| 89 | `Y` | `GY` |
| 121 | `y` | `Gy` |
| 97 | `a` | login error "already logged" |
| 118 | `v` | login error "bad version" |
| 35 | `#` | team chat kind |

Structural note: the `c` rubrique falls through into the `F` rubrique's sub-switch (verified on P-code, see
[friends.md](friends.md)); harmless for the codes the client uses.

### OK/error convention

`codeErreur` is computed for every frame, but only these handlers look at it (all others ignore the 3rd char, so e.g.
`GM|…`, `CL|…` are fine):

| Frame | OK form | Error form | Error sub-code (4th char unless noted) |
|---|---|---|---|
| `Al` | `AlK<lang>` | `AlE<c>` | `a` already logged · `v` bad version · other access denied |
| `AL` | `ALK\|…` | ignored | — |
| `AS` | `ASK\|…` | `ASE…` | none (silent, see account.md) |
| `AA` | `AAK` | `AAE…` | none ("Ce nom existe déjà") |
| `CJ` | `CJK<name>` | `CJE<name>` | none (trace only) |
| `GC` | `GCK\|…` | `GCE<c>` | lang key `ERROR_CREATING_<c>` — values UNKNOWN |
| `GJ` | `GJK\|…` | `GJE<c>` | lang key `ERROR_JOINING_<c>` — values UNKNOWN |
| `Gt` | `GtK<id>\|<team>` | `GtE…` | none (`CANT_CHANGE_TEAM`) |
| `cM` | `cMK<kind>\|…` | `cME<c><name>` | `S` syntax error · other → `USER_NOT_CONNECTED [name from index 4]` |
| `FA` | `FAK<entry>` | `FAE<c>` | `f` not found · `y` yourself · `a` already friend (whole remainder compared) |
| `FD` | `FDK` | `FDE<c>` | `f` not found |
| `SU` | `SUK<spell>` | ignored | — |
| `OD` | `ODK<id>` | `ODE…` | none (`DROP_FULL`) |
| `OA` | `OAK<awards>` | `OAE<c>` | `F` inventory full · `L` level too low (whole remainder compared) |
| `RC`, `RR` | — | — | dead family |

---

## Client states

| State | Values | Source |
|---|---|---|
| Connection | `m_bConnected` (set by `H`), `m_bAuthentified` (set by `AlK`, cleared on close), `m_UID` = key | `AKSClient/Dofus.Client.as:29-31`, `AKSClient/Dofus.Client.DataProcessor.as:30-31,76` |
| Player presence (who-is) | `C` channel, `1` entering game, `2` free game, `3` random game, `4` solo, `?` unknown | `AKSClient/Dofus.Client.as:23-28` |
| Friend presence | `C`, `1` solo, `2` multi, `3` random, `?` (differs from the row above) | `AKSClient/Dofus.Client.Account.as:86-102` |
| Game | `DATACENTER.Game.state` 1 solo, 2 free, 3 random; `m_bRunning` set by `GPS`, cleared by `GE`; `bInSearch` (`Gs` … `GPS`) | [game.md](game.md#game-states) |
| Action manager (per character) | 0 READY, 1 IN_PROGRESS (server answered), 2 TRANSMITTING (request sent) | `AKSClient/Dofus.GameActionsManager.as:6-8` |
| Map interaction | `move` 1, `spell` 2, `cc` 3, `place` 4; enabled/disabled per layer | `AKSClient/Dofus.BattleField.Interaction.as:16` |

UI phases (not protocol states, but they decide what the client sends): login screen → start menu (`AlK`) → character
list (`AL`) → village banner (`GCK|1`) → multiplayer screen (`GA` type 3 or leaving a running fight) → lobby tabs
(`GCK|2`, `GJK|2`, `GCK|3`) → fight (`GPS`) → result panel (`GE`).

---

## SWF6 runtime facts that change bytes or behaviour

`dofus-5b/AKSClient.swf` and `dofus-5b/modules/Interfaces.swf` are SWF version **6** (header byte 3 = 6, read with
`python3 -I`), so [SWF6 runtime]:

- **Identifiers are case-insensitive.** The client relies on it: `m_type`/`m_Type` (spell tab,
  `AKSClient/Dofus.DataCenter.Player.as:103`), `m_serverMessageID`/`m_ServerMessageID` (`AKSClient/Dofus.Client.DataProcessor.as:35`,
  `AKSClient/Events.AKS.as:23`), `lowxp`/`lowXp` (`AKSClient/Dofus.Client.Game.as:401`), `IsRunning`/`isRunning`
  (`AKSClient/Dofus.DataCenter.Player.as:153`), `isNan`/`isNaN` (`AKSClient/Dofus.DataCenter.Item.as:135`), `aks.Game.leave`
  (`modules_Interfaces/DefineButton2_873/BUTTONCONDACTION on(release).as:2`), `AKS.Game.CreateSolo`. A re-implementation
  of the client must keep these working.
- `undefined` concatenated into a string gives `""` in SWF6 (`"undefined"` from SWF7 on). Server-visible cases: `CJ` after
  leaving a lobby, `GJ3<id>|` when accepting an invitation, `PA…|` sex from the legacy creation button. **Accept both the
  empty and the literal `undefined` form.**
- Don't depend on `Number("")` (empty `GA` action id): use non-numeric ids when no ack is wanted.

---

## Connection, login and session sequence (byte-exact)

```
C: TCP connect :5555
S: H<key32>\0                                           → client: m_UID = key, onConnect(true) → logon
C: 5\n\0
C: <login>\n<cryptPassword(pw,key)>\n\0
S: AlK<lang>\0                                          → start menu  (AlEa / AlEv / AlE? on failure)
C: PL\n\0                                               (menu "play")
S: ALK|<id>;<name>;<lvl>;<model>;<sex>;<gfx>;<c1>;<c2>;<c3>|…\0
C: PS<id>\n\0
S: ASK|<30 fields>\0                                    → client sends GC1 by itself
C: GC1\n\0
S: GCK|1\0                                              → banner, client sends GD next frame
C: GD\n\0
S: GDM|<id>|<W>|<H>|<rp>|<bg>|<mapData>\0
S: GM|+<id>;…;<cell>;<dir>\0                            → village
S: GA<x>;3;<id>\0                                       → multiplayer screen
C: CJFrance\n\0
S: CJKFrance\0                                          → client sends CL
C: CL\n\0
S: CLK|<name>;<lvl>;<gfx>|…\0
…lobby (GC2/GJ2, GM), GS, GPS, GD/GDM, GR, Gp/GIC, GS, GTL, GTS/GA*/GTF…, GE, GQ/GV — see server-checklist.md
```

Re-login without the menu: "quit" (`AKSClient/Dofus.Kernel.as:294-303`) closes the socket, sets `m_bSkipMenu`, reconnects;
after `AlK` the client sends `PL` directly (`AKSClient/Events.AKS.as:49-52`). Kick with reason: `M0<id>` then close.

```mermaid
sequenceDiagram
    participant C as Client (AKSClient.swf)
    participant S as Server :5555
    C->>S: TCP connect
    S->>C: H<key>
    C->>S: 5\n
    C->>S: <login>\n<crypt>\n
    S->>C: AlK<lang>
    Note over C: start menu
    C->>S: PL
    S->>C: ALK|id;name;lvl;model;sex;gfx;c1;c2;c3|...
    C->>S: PS<id>
    S->>C: ASK|... (31 parts)
    C->>S: GC1
    S->>C: GCK|1
    C->>S: GD
    S->>C: GDM|id|W|H|1|bg|mapData
    S->>C: GM|+id;...;cell;dir
    Note over C: village (solo)
    S->>C: GAx;3;id
    Note over C: multiplayer screen
    C->>S: CJFrance
    S->>C: CJKFrance
    C->>S: CL
    S->>C: CLK|name;lvl;gfx|...
    C->>S: BL / GL2
    S->>C: mL<ids> / GLK|game;AAA|...
    C->>S: GC2Duel|map|AA|pw (or GJ2Duel|pw)
    S->>C: GCK|2|Duel|map|AA (or GJK|2|...)
    S->>C: GM|+id;...;LP;team;joinPos|...
    C->>S: GS (creator, game full)
    S->>C: GPS<cells0>|<cells1>
    C->>S: GD
    S->>C: GDM|id|W|H|0|bg|mapData
    C->>S: GR
    S->>C: GR (everybody ready)
    C->>S: Gp<cell>
    S->>C: GIC|id;cell;dir|...
    S->>C: GS (fight starts)
    S->>C: GTL|id|id
    loop turns
        S->>C: GTS<id>|<ms>
        C->>S: GA001<path> / GA300<spell>;<cell> / GA303<cell>
        S->>C: GAS<id>, GA<n>;<type>;<id>;<params>..., GAF<id>
        C->>S: GKK<n>
        C->>S: GT
        S->>C: GTF<id>
    end
    S->>C: GE<sender>|winner;id;lvl;dead;lowXp;xp;highXp;winXp;gold|...
    C->>S: GQ
    S->>C: GV
    C->>S: CJ (rejoin channel)
```

---

## HTTP side channels (not the socket)

For completeness — a full server re-creation would also serve: `http://jouer.dofus.com/files/login/getuser.php` (POST,
returns URL-encoded vars `l` login and `p` password for auto-login, `AKSClient/Dofus.Kernel.as:28-55`),
`files/login/swf/DofusLoginInterface.swf` (login UI, missing; must call `onLogin(login,password)` on its clip,
`modules_Interfaces/Dofus.Interface.as:63-81`), `files/login/delpath.php` (POST `path`, on bad version,
`AKSClient/Events.AKS.as:78-92`), `files/lang/langupdater.php` (lang SWF, `AKSClient/Dofus.Kernel.as:15-24`),
`files/news/news.php`, `files/maps/<id>.swf` (map previews, `modules_Interfaces/Interface.MapImage.as:13`),
`files/bugreport/index.php` (`AKSClient/Dofus.Kernel.Init.as:31-33`). Their formats beyond what is cited are **UNKNOWN —
not in code**.

---

## Message index

### Client → server (45)

| Code | Summary | Doc |
|---|---|---|
| `5` (version) | protocol version `5\n`, first frame after `H` | [account.md](account.md#version--credentials-cs) |
| `<login>\n<crypt>` | credentials | [account.md](account.md#version--credentials-cs) |
| `BW` | who am I / who is | [account.md](account.md#bw--aw--who-am-i--who-is-cs-sc) |
| `PL` | character list | [account.md](account.md#pl--al--character-list-cs-sc) |
| `PS` | select character | [account.md](account.md#ps--as--select-character-cs-sc) |
| `PA` | create character | [account.md](account.md#pa--aa--create-character-cs-sc) |
| `PD` | delete character | [account.md](account.md#pd--delete-character-cs) |
| `PB` | boost a stat | [account.md](account.md#pb--ab--boost-a-characteristic-cs-sc) |
| `FL` | friends list | [friends.md](friends.md#fl--friends-list-cs-sc) |
| `Fl` | friends for random team | [friends.md](friends.md#fl--friends-list-for-random-team-invitation-cs-sc) |
| `FA` | add friend | [friends.md](friends.md#fa--add-friend-cs-sc) |
| `FD` | remove friend | [friends.md](friends.md#fd--remove-friend-cs-sc) |
| `CJ` | join channel | [channel.md](channel.md#cj--join-channel-cs-sc) |
| `CL` | channel users | [channel.md](channel.md#cl--channel-user-list-cs-sc) |
| `BM` | chat / whisper / team | [chat.md](chat.md#bm--send-chat-message-cs) |
| `BS` | smiley | [chat.md](chat.md#bs--smiley-cs) |
| `IC` | player count | [infos.md](infos.md#ic--connected-player-count-cs-sc) |
| `IP` | podium | [infos.md](infos.md#ip--podium-cs-sc) |
| `IG` | general stats | [infos.md](infos.md#ig--general-statistics-cs-sc) |
| `OM` | equip item | [items.md](items.md#om--move-equip-an-item-cs) |
| `OD` | drop item | [items.md](items.md#od--drop-an-item-cs-sc) |
| `SM` | spell to bar slot | [spells.md](spells.md#sm--move-a-spell-to-the-used-spells-bar-cs-sc) |
| `SB` | boost spell | [spells.md](spells.md#sb--su--boost-upgrade-a-spell-cs-sc) |
| `SI` | spell boost info | [spells.md](spells.md#si--spell-boost-information-cs-sc) |
| `BL` | maps list | [game.md](game.md#bl--m--maps-list-cs-sc) |
| `GL` | open games list | [game.md](game.md#gl--list-open-games-cs-sc) |
| `GC` | create game (`GC1` solo, `GC2…` free, `GC3` random) | [game.md](game.md#gc--create-a-game-cs-sc) |
| `GJ` | join game | [game.md](game.md#gj--join-a-game-cs-sc) |
| `Gt` | change team | [game.md](game.md#gt--change-team-in-the-lobby-cs-sc) |
| `GS` | start game (creator) | [game.md](game.md#gs--start-the-game-cs--fight-starts-sc) |
| `Gi` | invite to random team | [game.md](game.md#random-team-invitations-gi-gy-gy-gu-gs) |
| `GY` | refuse invitation | [game.md](game.md#random-team-invitations-gi-gy-gy-gu-gs) |
| `GU` | cancel invitation | [game.md](game.md#random-team-invitations-gi-gy-gy-gu-gs) |
| `Gs` | start random search | [game.md](game.md#random-team-invitations-gi-gy-gy-gu-gs) |
| `GQ` | leave game / kick | [game.md](game.md#gq--leave-a-game--kick-a-player-cs-and-gv--left-sc) |
| `GD` | request map | [game.md](game.md#gd--gdm--gdc--map-data-cs-sc) |
| `GR` | ready after map load | [game.md](game.md#gr--ready-cs--everybody-ready-sc) |
| `Gp` | choose start cell | [game.md](game.md#gp--choose-a-start-cell-cs) |
| `GP` | players info (no caller) | [game.md](game.md#gp-gc-gi--client-requests-with-no-caller) |
| `Gc` | players coordinates (no caller) | [game.md](game.md#gp-gc-gi--client-requests-with-no-caller) |
| `GI` | game info (no caller) | [game.md](game.md#gp-gc-gi--client-requests-with-no-caller) |
| `GT` | end turn | [game.md](game.md#turns-gtl-gts-gtf-gt) |
| `GA` | action request (001 move, 300 spell, 303 close combat) | [game-actions.md](game-actions.md#ga--action-request-cs) |
| `GKK` | action acknowledged | [game-actions.md](game-actions.md#gkk--gke--acknowledge--cancel-an-action-cs) |
| `GKE` | move cancelled at cell | [game-actions.md](game-actions.md#gkk--gke--acknowledge--cancel-an-action-cs) |

Plus the console `/c <raw>` escape hatch ([console.md](console.md)).

### Server → client (61, of which 5 dead `R` frames and 3 no-ops)

| Code | Summary | Doc |
|---|---|---|
| `H` | handshake key | [account.md](account.md#h--handshake-key-sc) |
| `Al` | login result | [account.md](account.md#al--login-result-sc) |
| `M` | server notice | [account.md](account.md#m--server-notice-sc) |
| `AW` | who-is answer | [account.md](account.md#bw--aw--who-am-i--who-is-cs-sc) |
| `AL` | character list | [account.md](account.md#pl--al--character-list-cs-sc) |
| `AS` | selected character (31 parts) | [account.md](account.md#ps--as--select-character-cs-sc) |
| `AA` | creation result | [account.md](account.md#pa--aa--create-character-cs-sc) |
| `AB` | stats update | [account.md](account.md#pb--ab--boost-a-characteristic-cs-sc) |
| `AN` | new level | [account.md](account.md#an--new-level-sc) |
| `FL` | friends list | [friends.md](friends.md#fl--friends-list-cs-sc) |
| `Fl` | friends for random team | [friends.md](friends.md#fl--friends-list-for-random-team-invitation-cs-sc) |
| `FA` | add friend result | [friends.md](friends.md#fa--add-friend-cs-sc) |
| `FD` | remove friend result | [friends.md](friends.md#fd--remove-friend-cs-sc) |
| `FI` | friend online | [friends.md](friends.md#fi--fo--friend-online--offline-notifications-sc) |
| `FO` | friend offline | [friends.md](friends.md#fi--fo--friend-online--offline-notifications-sc) |
| `CJ` | channel joined | [channel.md](channel.md#cj--join-channel-cs-sc) |
| `CL` | channel users | [channel.md](channel.md#cl--channel-user-list-cs-sc) |
| `CM` | channel join/leave | [channel.md](channel.md#cm--channel-movement-sc) |
| `cM` | chat message / error | [chat.md](chat.md#cm--chat-message-delivery-sc) |
| `cS` | smiley | [chat.md](chat.md#cs--show-smiley-sc) |
| `IC` | player count | [infos.md](infos.md#ic--connected-player-count-cs-sc) |
| `IP` | podium | [infos.md](infos.md#ip--podium-cs-sc) |
| `IG` | general stats | [infos.md](infos.md#ig--general-statistics-cs-sc) |
| `OA` | items/gold awarded | [items.md](items.md#oa--itemsgold-awarded-sc) |
| `OD` | drop result | [items.md](items.md#od--drop-an-item-cs-sc) |
| `OW` | weapon change | [items.md](items.md#ow--weapon-change-of-a-character-sc) |
| `OF` | ignored | [items.md](items.md#of-sc) |
| `SM` | spells to panel | [spells.md](spells.md#sm--move-a-spell-to-the-used-spells-bar-cs-sc) |
| `SU` | spell upgraded | [spells.md](spells.md#sb--su--boost-upgrade-a-spell-cs-sc) |
| `SI` | spell boost info | [spells.md](spells.md#si--spell-boost-information-cs-sc) |
| `m` | maps list | [game.md](game.md#bl--m--maps-list-cs-sc) |
| `GC` | game created | [game.md](game.md#gc--create-a-game-cs-sc) |
| `GJ` | game joined | [game.md](game.md#gj--join-a-game-cs-sc) |
| `GL` | open games | [game.md](game.md#gl--list-open-games-cs-sc) |
| `GM` | characters enter/leave game | [game.md](game.md#gm--characters-entering--leaving-the-current-game-sc) |
| `Gt` | team changed | [game.md](game.md#gt--change-team-in-the-lobby-cs-sc) |
| `GS` | fight starts (end of placement) | [game.md](game.md#gs--start-the-game-cs--fight-starts-sc) |
| `GY` | invitation received | [game.md](game.md#random-team-invitations-gi-gy-gy-gu-gs) |
| `Gi` | invitation failed | [game.md](game.md#random-team-invitations-gi-gy-gy-gu-gs) |
| `Gy` | invitation cancelled | [game.md](game.md#random-team-invitations-gi-gy-gy-gu-gs) |
| `Gs` | search started | [game.md](game.md#random-team-invitations-gi-gy-gy-gu-gs) |
| `GV` | left the game | [game.md](game.md#gq--leave-a-game--kick-a-player-cs-and-gv--left-sc) |
| `GDM` | full map | [game.md](game.md#gd--gdm--gdc--map-data-cs-sc), [encodings.md](encodings.md#map-data-gdm) |
| `GDC` | one cell update | [game.md](game.md#gd--gdm--gdc--map-data-cs-sc), [encodings.md](encodings.md#cell-update-gdc) |
| `GR` | everybody ready → placement | [game.md](game.md#gr--ready-cs--everybody-ready-sc) |
| `GPS` | placement cells | [game.md](game.md#gps--placement-start-sc) |
| `GIC` | characters' coordinates | [game.md](game.md#gic--characters-coordinates-sc) |
| `GIM` | map info (no-op) | [game.md](game.md#gim-gip--map--players-information-sc-effectively-dead) |
| `GIP` | players info (broken) | [game.md](game.md#gim-gip--map--players-information-sc-effectively-dead) |
| `GTL` | turn order | [game.md](game.md#turns-gtl-gts-gtf-gt) |
| `GTS` | turn start | [game.md](game.md#turns-gtl-gts-gtf-gt) |
| `GTF` | turn end | [game.md](game.md#turns-gtl-gts-gtf-gt) |
| `GE` | game end / results | [game.md](game.md#ge--game-end-sc) |
| `GA` | action result | [game-actions.md](game-actions.md#ga--action-result-sc) |
| `GAS` | action block start | [game-actions.md](game-actions.md#gas--gaf--action-block-start--finish-sc) |
| `GAF` | action block finish | [game-actions.md](game-actions.md#gas--gaf--action-block-start--finish-sc) |
| `RC`, `RI`, `RR`, `RA`, `RJ` | dead (no handler object) | [misc.md](misc.md#r-family--random-game-sc-dead) |

---

## Open UNKNOWNs (not in code)

- All lang texts (`SRV_MSG_<id>`, `ERROR_CREATING_<c>`, `ERROR_JOINING_<c>`, chat keys, map/spell/item names): the lang
  SWF from `langupdater.php` is missing — so the **error code letters for `GCE`/`GJE`** and the `M` message ids are unknown.
- Meaning of `FI`/`FO` fields `p1;p2`, of the `AW` `param` field, and whether `BW<name>` takes an account or a character name.
- The 2nd char of the `m` maps-list frame and the 4th char the original server used for normal `cM` lines (client ignores both).
- Field layouts of the dead `R` family; meaning of `OF`; fields 9-10 of `GIP`.
- Server-side rules (damage, AP costs of moves, turn duration, XP, matchmaking) — the client only displays results.
