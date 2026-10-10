# Miscellaneous: dead handlers, unhandled codes

Conventions: see [account.md](account.md) header.

## R family — random game (S→C, dead)

The dispatcher routes rubrique `R` (82) to `AKS.RandomGame` (`AKSClient/Dofus.Client.DataProcessor.as:409-441`), but
`Class_Client.init` never creates a `RandomGame` member (`AKSClient/Dofus.Client.as:9-34`) and no other file defines one
(grep, case-insensitive). Every call below is a method call on `undefined` → **no effect**. Random-team play works through
`GC3`, `Gi`, `GY`, `Gy`, `GU`, `Gs` instead ([game.md](game.md#random-team-invitations-gi-gy-gy-gu-gs)).

| Frame | Would call | Code |
|---|---|---|
| `RCK<data>` / `RCE<data>` | `RandomGame.innerOnCreate(ok, substr(3))` | `AKSClient/Dofus.Client.DataProcessor.as:412-421` |
| `RI<data>` | `RandomGame.innerOnInvite(substr(2))` | `:422-424` |
| `RRK<data>` / `RRE<data>` | `innerOnRefuseInvitation(true, substring(2))` / `(false, substring(3))` | `:425-434` |
| `RA<data>` | `innerOnAcceptInvitation(substring(2))` | `:435-437` |
| `RJ<data>` | `innerOnjoin(substr(3))` | `:438-439` |

Field layouts: **UNKNOWN — not in code**. A server never needs to send these.

## Other silent cases

- First char not in `H M m I S A C G c F R O` → ignored (`default: return`, `AKSClient/Dofus.Client.DataProcessor.as:456-457`). Unknown 2nd
  chars inside a known rubrique are ignored too.
- `OF…` ignored ([items.md](items.md#of-sc)); `GIM` / `GIP` effectively no-ops ([game.md](game.md#gim-gip--map--players-information-sc-effectively-dead));
  `AAK` does nothing ([account.md](account.md#pa--aa--create-character-cs-sc)); `SUE`, `ALE`, `CJE` (only a trace),
  `SM -…` entries do nothing.
- Every received frame, recognised or not, closes the "waiting" spinner (`AKSClient/Dofus.Client.DataProcessor.as:12`).

## Client requests with no caller

`GP`, `Gc`, `GI` exist in `AKSClient/Dofus.Client.Game.as:63-78` but nothing calls them ([game.md](game.md#gp-gc-gi--client-requests-with-no-caller)).
A user can still send anything with the console `/c` command ([console.md](console.md)).
