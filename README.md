# Dofus Beta 5b — nostalgie

The Dofus **beta 5b** client (13 January 2004, Flash 6 / ActionScript 1), ported to TypeScript for the browser, plus a
lightweight Rust server. The original files are in `dofus-5b/` (read-only).

## Play

Asset tooling needs JPEXS + a Java runtime in `tools/` (gitignored, project-local): unzip
[ffdec_26.3.0.zip](https://github.com/jindrapetrik/jpexs-decompiler/releases/download/version26.3.0/ffdec_26.3.0.zip)
into `tools/ffdec/` and a Temurin 21 JRE ([macOS arm64](https://api.adoptium.net/v3/binary/latest/21/ga/mac/aarch64/jre/hotspot/normal/eclipse))
into `tools/jre/` (`tools/ffdec.sh` expects `tools/jre/Contents/Home/bin/java`).

```sh
bun install
bun scripts/assets/convert.ts          # SWF → web/public/assets/swf/   (once)
bun scripts/assets-media/extract.ts    # sounds, fonts, bitmaps → web/public/assets/media/   (once)
bun scripts/copy-music.ts              # beta music → web/public/assets/media/music/   (once)

cd server && cargo run --release       # game server on ws://127.0.0.1:5555
bun run dev                            # client on http://localhost:5173
```

Open two tabs at http://localhost:5173, log in with any account name and password (accounts are created on first
login), create a character and join the same channel. Then either:

- **Entraînement** (free games): create a game in one tab, join it from the other;
- **Jouer → Jouer seul** in both tabs: random matchmaking pairs you up (parties of friends via *Constituer une équipe*).

- `/?replay=fight` plays a scripted session with no server (login `bo` / `pass`).
- `/?server=ws://host:port` points the client at another server.

## Checks

```sh
bun test && bun run typecheck
cd server && cargo test && cargo clippy --all-targets -- -D warnings
bun scripts/playtest.ts                # two headless clients play full games against the real server
```

## Docs

`docs/BRIEF.md` (start here), `docs/protocol/` (network protocol), `docs/logic/` (game logic), `docs/server.md`,
`docs/runtime.md` (Flash 6 runtime), `docs/assets-format.md`, `docs/content-reconstruction.md` (lost text and what
replaced it), `docs/missing-data-search.md`, `docs/playtest.md`.

Lost content (language files, beta maps, login screen, some sounds) is substituted with clearly labelled material:
2004 maps and early French text from [dofedex](https://github.com/dofera/dofedex), text from beta screenshots, and
authored placeholders — see `web/public/lang/fr.provenance.json`.
