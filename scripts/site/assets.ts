// Builds web/public/site/ (the project website's images and music) from the Wayback captures in
// vendor/wayback-dofus-site/ and the generated game assets in web/public/assets/media/ (run the README asset scripts
// first). The 2004 banner and title tabs have their French text erased so the pages can overlay FR or EN text.
// docs/website.md §5 explains every choice. Usage: bun scripts/site/assets.ts
import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";

const P = "vendor/wayback-dofus-site/post-beta/";
const B = "vendor/wayback-dofus-site/beta/";
const M = "web/public/assets/media/";
const OUT = "web/public/site/";

type Rect = [x0: number, y0: number, x1: number, y1: number];

/** Paints over text inside `rect`. Default: pixels far from their row's median colour (plus a 1 px halo) are replaced
 * by interpolating the nearest kept pixels on the same row, which keeps faint textures (needs the text to cover under
 * half of each row). With `ref` = [x0, x1], a clean strip beside the text, every pixel of the row takes that strip's
 * median colour instead (for bold lettering with a light glow). */
export function erase(ctx: SKRSContext2D, [x0, y0, x1, y1]: Rect, ref?: [number, number], threshold = 48) {
  const w = x1 - x0, h = y1 - y0;
  const img = ctx.getImageData(x0, y0, w, h), d = img.data;
  const [r0, r1] = ref ?? [x0, x1], rw = r1 - r0, rd = ctx.getImageData(r0, y0, rw, h).data;
  const hit = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const med = [0, 1, 2].map((c) => {
      const v = Array.from({ length: rw }, (_, x) => rd[(y * rw + x) * 4 + c]!).sort((a, b) => a - b);
      return v[rw >> 1]!;
    });
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (ref) d.set([med[0]!, med[1]!, med[2]!], i);
      else if (Math.abs(d[i]! - med[0]!) + Math.abs(d[i + 1]! - med[1]!) + Math.abs(d[i + 2]! - med[2]!) > threshold) hit[y * w + x] = 1;
    }
  }
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) if (hit[(y + dy) * w + x + dx] && x + dx >= 0 && x + dx < w) mask[y * w + x] = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      let end = x;
      while (end < w && mask[y * w + end]) end++;
      const l = x > 0 ? x - 1 : end, r = end < w ? end : x - 1;
      for (let k = x; k < end; k++) {
        const t = r === l ? 0 : (k - l) / (r - l);
        for (let c = 0; c < 4; c++) d[(y * w + k) * 4 + c] = Math.round(d[(y * w + l) * 4 + c]! * (1 - t) + d[(y * w + r) * 4 + c]! * t);
      }
      x = end;
    }
  }
  ctx.putImageData(img, x0, y0);
}

async function blank(src: string, out: string, rects: Rect[], ref?: [number, number]) {
  const img = await loadImage(src);
  const c = createCanvas(img.width, img.height), ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  for (const r of rects) erase(ctx, r, ref);
  writeFileSync(OUT + out, c.toBuffer("image/png"));
}

if (import.meta.main) {
  mkdirSync(OUT, { recursive: true });

  // 1.0 banner (SWF of 2004-09-16, idle frame): top-right tab, Tofu bubble, nav labels.
  await blank(P + "swf-export/d1_bandeau_20040916_frame3.png", "banner.png", [
    [552, 9, 744, 25],
    [222, 86, 512, 102],
    [62, 114, 116, 131],
    [196, 114, 724, 131],
  ]);
  // 1.0 title tabs (2004-11 / 2005-01 captures): lettering erased, fold and monster vignette kept.
  await blank(P + "img/d1_home_titre_jouer.gif", "tab-jouer.png", [[38, 12, 142, 60]], [145, 168]);
  await blank(P + "img/d1_home_titre_new.gif", "tab-news.png", [[38, 12, 100, 42]], [104, 132]);
  await blank(P + "img/d1_home_titre_proch.gif", "tab-proch.png", [[38, 12, 162, 60]], [162, 170]);
  await blank(P + "img/d1_home_titre_savoir.gif", "tab-savoir.png", [[12, 26, 216, 46]], [214, 234]);
  await blank(P + "img/d1_home_titre_abo.gif", "tab-abo.png", [[44, 6, 228, 30]], [226, 236]);
  await blank(P + "img/d1_home_titre_sond.gif", "tab-sond.png", [[8, 5, 74, 26]], [90, 200]);

  const copies: [string, string][] = [
    [P + "img/d1_home_fond_new.png", "card.png"], // cream card body with tan edges (1 px tall, repeat-y)
    [P + "img/d1_home_fond_proch.gif", "card-dark.gif"], // darker beige body
    [P + "img/d1_home_fond_sond.gif", "card-end.gif"], // rounded bottom cap
    [P + "img/d1_home_footer_simple.gif", "footer.gif"],
    [P + "img/d1_home_fd_bt_voter.gif", "button.gif"],
    [P + "img/d1_etoilem.gif", "star.gif"],
    [B + "img/dofus.com_favicon_20030805.ico", "favicon.ico"], // 2003 dofus.com favicon (potion)
    [M + "bitmaps/clips/guilds/artwork/big/50.swf/1.png", "classes.png"], // beta 5b class group artwork
    [M + "bitmaps/clips/objects.swf/1235.png", "tree-1.png"],
    [M + "bitmaps/clips/objects.swf/1238.png", "tree-2.png"],
    [M + "music/04.mp3", "music.mp3"], // village theme, beta 3b music pack (26 Oct 2003)
  ];
  for (const [src, out] of copies) copyFileSync(src, OUT + out);

  // 94×94 thumbnail of the port at fight placement (our own render).
  const shot = await loadImage("web/public/assets/port-preview/kernel/07-placement.png");
  const v = createCanvas(94, 94);
  v.getContext("2d").drawImage(shot, 200, 60, 300, 300, 0, 0, 94, 94);
  writeFileSync(OUT + "thumbnail.png", v.toBuffer("image/png"));
  console.log("web/public/site/ written");
}
