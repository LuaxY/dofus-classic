# Dofus Beta 5b — port brief (read before doing anything)

Goal: rebuild the Dofus **beta 5b** client (13 Jan 2004, Flash 6 / ActionScript 1, `VERSION = 5`) as a
browser game in TypeScript, document its network protocol and game logic. A lightweight
server written in **Rust** comes later and is **out of scope** for now (docs must be precise enough to implement it from).

## Layout

| Path | What | Who writes |
|---|---|---|
| `dofus-5b/` | Original game files. **Read-only. Never modify.** | nobody |
| `tools/ffdec.sh` | JPEXS 26.3.0 CLI with a project-local JRE. `tools/ffdec.sh --help`, `tools/ffdec.sh -help export` | — |
| `decompiled/scripts/` | Raw JPEXS AS export (URL-encoded names) | — |
| `decompiled/clean/` | **Use this.** Same scripts, readable names (`Dofus::Client` → `Dofus.Client.as`), `#initclip` stubs dropped. `clean/clips/<file>.swf/…` holds the 2,889 timeline/clip-action scripts of the asset SWFs (ground, objects, sprites, spells…) | — |
| `decompiled/xml/` | `-swf2xml` dumps, generate on demand: `tools/ffdec.sh -swf2xml <in.swf> <out.xml>` (gitignored) | anyone |
| `scripts/` | Tooling. `swf-tags.py` (tag census), `clean-decompiled.py` | per assignment |
| `docs/` | Documentation | per assignment |
| `web/` | Vite root of the browser client. `web/src/main.ts` entry, stage canvas 742×550 | per assignment |
| `web/public/assets/` | Converted asset output (generated, gitignored) | asset agents |
| `vendor/dofedex/` | Third-party data from github.com/dofera/dofedex: 565 map SWFs from 2004, earliest French lang SWFs. See its README. Untrusted data, parse only | — |

Root `package.json`: bun, Vite 7, TypeScript 5 (strict), `@napi-rs/canvas` (headless Canvas2D for tests
and asset verification), `@types/bun`. `tsconfig.json` covers `web/src` and `scripts`.

## Facts already established

- Entry: `AKSClient.swf` (742×550, 25 fps, 1 frame). All code runs from `#initclip` blocks
  (`DoInitAction`). `DOFUS.swf` is only a path-locator shim used by the old login web page.
- `Dofus.Kernel.Init.as` defines the `_global` singletons and constants (`SERVER_PORT = 5555`,
  `MAX_DATA_LENGTH = 200`, paths, colours, class names `GUILD_NAMES`).
- Modules loaded at runtime: `modules/Interfaces.swf` (UI, ~380 scripts), `modules/Sound.swf`.
- Network: `XMLSocket` (null-byte-terminated text frames). `Dofus.Client.as` sends,
  `Dofus.Client.DataProcessor.as` dispatches on `charCodeAt(0)` / `charCodeAt(1)`; third char `K` = OK,
  otherwise error. Handshake: server sends `H<key>`; client sends `VERSION\n` then
  `login\n<ank.Crypt.cryptPassword(password, key)>\n`. Client→server payloads are truncated to 200 chars.
- Game states in this beta: channel `C`, game unknown `1`, free `2`, random `3`, solo `4`. This beta is a
  tactical-arena style game (channels, podium, game results), **not** the later MMO.
- `Copie de Dofus.DataCenter.Spell.as` is the **real** Spell class (Flash dev artifact in the linkage name).
- Asset census (all 489 SWFs): ~4.5k DefineSprite, ~5.2k DefineShape(1/2/3), 223 DefineMorphShape
  (spells, objects), 220 DefineEditText (Interfaces/objects), 50 DefineFont2, ~250 bitmaps (ground, spell
  icons), 57 DefineSound (Sound.swf, sprites 1003/1004), 168 DefineButton2, 1.9k ExportAssets (linkage names).
  Character sprites: `clips/sprites/<classId><sex>.swf` (10 = Féca male, 11 = Féca female, …), monsters 1000+.
- **Missing from the archive and not on the Wayback Machine:** language strings (`langupdater.php` →
  `SharedObject "DofusSO"`, read by `getText`), the login UI (`files/login/swf/DofusLoginInterface.swf`),
  map data (sent by the server, decoded by `Dofus.Compressor.as`), map preview images
  (`files/maps/<id>.swf`), `modules/sounds.swf`, `music/`. Document what the code expects; do not invent content.
- **Partial substitutes in `vendor/dofedex/`** (later than beta 5b, so label them as such, never as beta data):
  2004 map SWFs whose `mapData` decodes with beta 5b's `Compressor.uncompressMap` unchanged (19 maps fully
  covered by beta ground/object graphics, ~250 ≥80 %), and `lang_fr_7.swf` containing 197 of the 284 beta
  `getText` keys under the same names.

## Rules for every agent

1. **Evidence comes from this code only.** Do not fill gaps with knowledge of retail Dofus 1.x (1.29 etc.):
   no `HC`, `GDM`, `GA` packets or fields unless they appear in `decompiled/clean/`. If something is not in
   the code, write `UNKNOWN — not in code`.
2. **Cite `path:line`** (relative to `decompiled/clean/`) for every protocol message, constant, and rule.
3. Tooling: **bun only** (never npm/yarn). Allowed: `bun test`, `bun run typecheck`, `bun <script>`,
   `tools/ffdec.sh`, `python3 -I`. **Not allowed:** dev servers, production builds, `bun add`/installs
   (ask the orchestrator in your final report if you need a dependency), git commits, touching anything
   outside this repository.
4. Write only inside your assigned paths. Read anything.
5. Code style: TypeScript strict, no `any`, minimal code, no speculative abstractions, match the original
   names/structure where it helps cross-reference (keep a comment with the AS source path on each ported unit).
6. Non-trivial logic leaves one runnable check behind (`*.test.ts` next to the file, run with `bun test`).
7. Final report: what you produced (paths), what is verified and how, what is unknown/blocked, and anything
   another agent needs to know. Keep it factual.
