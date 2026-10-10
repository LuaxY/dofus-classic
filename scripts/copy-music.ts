// Copies the beta 3b music pack (vendor/archive-dofus-1/music-v3b/music/: 02, 04, 08, 10, 11, 12.mp3 — the tracks
// beta 5b plays, modules_Sound/Dofus.Sound.Params.as:46-52; 07.mp3, the lobby music, is missing everywhere) to
// web/public/assets/media/music/, which Kernel.Init's MUSIC_PATH points at. Run: `bun scripts/copy-music.ts`.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SRC = join(ROOT, "vendor/archive-dofus-1/music-v3b/music");
const DST = join(ROOT, "web/public/assets/media/music");
mkdirSync(DST, { recursive: true });
const files = readdirSync(SRC).filter((f) => f.endsWith(".mp3"));
for (const f of files) copyFileSync(join(SRC, f), join(DST, f));
console.log(`copied ${files.length} tracks to ${DST}: ${files.join(", ")}`);
