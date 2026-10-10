// Browser entry (web/index.html). `?replay=<fixture>` plays a scripted server (web/src/dev/fixtures.ts) through
// a WebSocket stand-in; otherwise `?server=ws://…` (default: the Rust dev server, ws://127.0.0.1:5555).
import { installReplay } from "./dev/replay.ts";
import { boot } from "./game/kernel/boot.ts";
import { browserAudio } from "./runtime/player.ts";
import { browserLoader } from "./swf/render.ts";

const q = new URLSearchParams(location.search);
const replay = q.get("replay");
if (replay) installReplay();

const fonts = document.createElement("link");
fonts.rel = "stylesheet";
fonts.href = "/assets/media/fonts.css";
// Canvas text never triggers @font-face downloads reliably: load every face before the first frame is drawn.
const fontsLoaded = new Promise((resolve) => (fonts.onload = fonts.onerror = resolve)).then(() =>
  Promise.all([...document.fonts].map((f) => f.load().catch(() => undefined))),
);
document.head.appendChild(fonts);

void fontsLoaded
  .then(() =>
    boot({
      loader: browserLoader(),
      audio: browserAudio(),
      serverURL: replay ? "replay:" + replay : (q.get("server") ?? "ws://127.0.0.1:5555"),
    }),
  )
  .then((p) => p.start(document.getElementById("stage") as HTMLCanvasElement));
