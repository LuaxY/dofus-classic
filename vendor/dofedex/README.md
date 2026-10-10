# Third-party data: dofedex

Source: https://github.com/dofera/dofedex ("A Dofus Retro encyclopedia"), fetched 2026-10-10.
Untrusted data — parse only, never execute.

- `maps-2004/` — every map SWF whose filename timestamp (`<id>_<YYMMDDHHMM>.swf`) is from 2004
  (565 files, earliest 2004-07-15). Each holds `id, width, height, backgroundNum, ambianceId, musicId,
  bOutdoor, capabilities, mapData` as plain AS variables. `mapData` decodes with beta 5b's own
  `Dofus.Compressor.uncompressMap` (10 chars/cell, no cell uses the later extended-id bits).
  Coverage by beta 5b graphics (`clips/ground.swf` ids 1–511, `clips/objects.swf` ids 1–1070):
  19 maps fully covered, ~250 ≥80 %. These are post-beta (1.0-era) maps, not beta 5b arena maps.
- `lang-fr/` — earliest French lang SWFs available: `lang_fr_7` (UI strings: 197 of the 284 beta
  `getText` keys exist with the same names), `classes_fr_31`, `spells_fr_100`, `items_fr_13`,
  `maps_fr_35`, `effects_fr_90`, `monsters_fr_92`. Later than beta 5b; IDs of spells/items may not match.
