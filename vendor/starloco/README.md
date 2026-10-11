# Third-party data: StarLoco (Dofus Retro emulator)

Source: https://github.com/StarLoco/StarLoco, file `docker/db-init/04-game.sql` (MySQL dump of the game database),
commit `80b5889f158ac9f174f512fc2998e2bb1cc45fed` (2025-01-14, "add db-init"), fetched 2026-10-11 from
https://raw.githubusercontent.com/StarLoco/StarLoco/HEAD/docker/db-init/04-game.sql (71,803,761 bytes,
sha256 `aafe3376dc38c67bb2bdd5de60ff43465f3d46fbc5d6738ad8cb4d67915289fa`). Untrusted data: parsed as text only,
never executed or loaded into a database.

StarLoco emulates **Dofus Retro 1.39.8** (much later than beta 5b and than the 2004 maps of `vendor/dofedex/`). Map
ids are the same across versions; cell layouts may differ. Provenance tag in this repo: `retro_emulator`
(`docs/content-reconstruction.md` §1.1).

Only two extracts are kept (the full dump is not, for size):

- `scripted_cells.sql` — every `INSERT INTO \`scripted_cells\`` line, verbatim (23,795 rows:
  `MapID, CellID, ActionID, EventID, ActionsArgs, Conditions`; teleports are `ActionID 0`, `EventID 1`,
  `ActionsArgs '<map>,<cell>'`, `Conditions '-1'` when unconditional).
  `grep '^INSERT INTO \`scripted_cells\` VALUES ' 04-game.sql > scripted_cells.sql`
- `maps_mappos.tsv` — `id, date, width, heigth, mappos` of the 9,360 `maps` rows (`mappos` = `x,y,subarea`), read
  with the regex
  `^INSERT INTO \`maps\` VALUES \((\d+), '(\d+)', (-?\d+), (-?\d+), '[^']*', '[^']*', '[^']*', '[^']*', (-?\d+), '([^']*)'`
  (groups 1-4 and 6); every row matched.

Used by `scripts/server-data/maps.ts` (the world maps of `server/data/maps.json`). Checked against the 2004 maps:
of the 1,450 unconditional teleports whose source map is one of the 565 dofedex maps, 1,367 (94 %) sit on a cell
holding the map-change plate (object 1030, either object layer) in the 2004 data. `mappos` x,y agree with `vendor/dofedex/lang-fr/maps_fr_35.swf`
(`MA.m`) for 449 of those maps, differ for 113 (mostly the sub-area), and are missing for 3; they agree for all 51
world maps.
