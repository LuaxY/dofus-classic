// Extract non-vector media (sounds, fonts, bitmaps, texts) from dofus-5b/ into web/public/assets/media/.
// Usage: bun scripts/assets-media/extract.ts      (spec: docs/assets-media.md)
// JPEXS decodes the payloads (one JVM run over a flat symlink dir); swf.ts indexes tags and decodes texts.
import { $ } from "bun";
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, symlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadImage } from "@napi-rs/canvas";
import { T, TAG_NAME, charId, exportsOf, readEditText, readFont2, readSwf, readText, Reader } from "./swf.ts";
import type { Font, Swf } from "./swf.ts";

const ROOT = resolve(import.meta.dir, "../..") + "/";
const SRC = ROOT + "dofus-5b/";
const OUT = ROOT + "web/public/assets/media/";
const WORK = OUT + ".work/";
const FFDEC = ROOT + "tools/ffdec.sh";
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const FFPROBE = "/opt/homebrew/bin/ffprobe";
const DOC = ROOT + "docs/assets-media.md";

const flat = (p: string) => p.replaceAll("/", "~");
const safe = (s: string) => s.replace(/[^\w.-]+/g, "_");
const write = (path: string, data: unknown) => Bun.write(OUT + path, typeof data === "string" ? data : JSON.stringify(data, null, 1) + "\n");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(WORK + "flat", { recursive: true });
const swfPaths = [...new Bun.Glob("**/*.swf").scanSync(SRC)].sort();
for (const p of swfPaths) symlinkSync(SRC + p, WORK + "flat/" + flat(p));

console.log(`JPEXS: exporting ${swfPaths.length} SWFs...`);
await $`${FFDEC} -onerror ignore -format sound:mp3_wav,image:png_gif_jpeg,font:ttf -export sound,image,font ${WORK}raw ${WORK}flat`.quiet();
await $`${FFDEC} -onerror ignore -format font:woff -export font ${WORK}woff ${WORK}flat`.quiet();

/** JPEXS names exported files `<id>.<ext>` or `<id>_<linkage/font name>.<ext>`. */
function jpexsFile(dir: string, id: number) {
  let names: string[] = [];
  try { names = readdirSync(dir); } catch { /* no such dir: nothing exported */ }
  const name = names.find((n) => n.match(/^(-?\d+)[._]/)?.[1] === String(id));
  return name && dir + "/" + name;
}

const RATES = [5512.5, 11025, 22050, 44100];
const sounds: Record<string, unknown> = {};
const fonts: Record<string, Record<number, unknown>> = {};
const faces = new Map<string, { font: Font; file: string }>();
const allFonts: Font[] = [];
const bitmaps: Record<string, unknown[]> = {};
const textFiles: { swf: string; texts: TextEntry[] }[] = [];
type TextEntry = { id: number; text: string; tag: string; usedIn: string[] } & Record<string, unknown>;

for (const p of swfPaths) {
  const swf = readSwf(new Uint8Array(await Bun.file(SRC + p).arrayBuffer()));
  const exp = exportsOf(swf);
  const raw = WORK + "raw/" + flat(p);
  const fontMap = new Map<number, Font>();
  const texts: TextEntry[] = [];
  const startSounds = swf.tags.filter((t) => t.code === T.StartSound).map((t) => ({ id: charId(t), sprite: t.sprite, frame: t.frame }));

  for (const t of swf.tags) {
    const id = charId(t);
    switch (t.code) {
      case T.DefineSound: {
        const src = jpexsFile(raw + "/sounds", id);
        if (!src) throw new Error(`${p}#${id}: JPEXS exported no sound`);
        const linkage = exp.get(id);
        const file = `sounds/${safe(linkage ?? `${p.replace(/\.swf$/, "").replaceAll("/", "-")}_${id}`)}.mp3`;
        mkdirSync(OUT + "sounds", { recursive: true });
        // All 57 DefineSounds in this corpus are MP3 (format 2) and are copied as-is; anything else is transcoded.
        if (src.endsWith(".mp3")) copyFileSync(src, OUT + file);
        else await $`${FFMPEG} -v error -y -i ${src} -codec:a libmp3lame -q:a 4 ${OUT + file}`;
        const b = t.data[2]!;
        const sampleCount = new Reader(t.data.subarray(3)).u32();
        const rate = RATES[(b >> 2) & 3]!;
        const duration = Number((await $`${FFPROBE} -v error -show_entries format=duration -of csv=p=0 ${OUT + file}`.text()).trim());
        sounds[linkage ?? `${p}#${id}`] = {
          file, swf: p, id, linkage: linkage ?? null, swfFormat: b >> 4, rate, stereo: (b & 1) === 1,
          duration, declaredDuration: Number((sampleCount / rate).toFixed(3)), bytes: statSync(OUT + file).size,
          startSounds: startSounds.filter((s) => s.id === id).map(({ sprite, frame }) => ({ sprite, frame })),
        };
        break;
      }
      case T.DefineFont2: {
        const font = readFont2(t);
        fontMap.set(id, font);
        allFonts.push(font);
        const entry: Record<string, unknown> = { name: font.name, bold: font.bold, italic: font.italic, glyphs: font.codes.length };
        if (exp.has(id)) entry.linkage = exp.get(id);
        if (font.codes.length) {
          const hash = new Bun.CryptoHasher("sha1").update(t.data.subarray(2)).digest("hex").slice(0, 8);
          const file = `fonts/${safe(font.name)}${font.bold ? "-bold" : ""}${font.italic ? "-italic" : ""}-${hash}`;
          if (!faces.has(file)) {
            const ttf = jpexsFile(raw + "/fonts", id);
            const woff = jpexsFile(WORK + "woff/" + flat(p), id);
            if (!ttf || !woff) throw new Error(`${p}#${id}: JPEXS exported no font`);
            mkdirSync(OUT + "fonts", { recursive: true });
            copyFileSync(ttf, OUT + file + ".ttf");
            copyFileSync(woff, OUT + file + ".woff");
            faces.set(file, { font, file });
          }
          entry.file = file + ".woff";
          entry.ttf = file + ".ttf";
        } else {
          entry.device = true; // no outlines: Flash used the system font of that name
          entry.fallback = deviceFallback(font.name);
        }
        (fonts[p] ??= {})[id] = entry;
        break;
      }
      case T.DefineBits: case T.DefineBitsJPEG2: case T.DefineBitsJPEG3: case T.DefineBitsLossless: case T.DefineBitsLossless2: {
        const src = jpexsFile(raw + "/images", id);
        if (!src) throw new Error(`${p}#${id}: JPEXS exported no image`);
        const file = `bitmaps/${p}/${id}.${src.split(".").pop()}`;
        mkdirSync(dirname(OUT + file), { recursive: true });
        copyFileSync(src, OUT + file);
        const img = await loadImage(OUT + file);
        (bitmaps[p] ??= []).push({ id, tag: TAG_NAME[t.code]!, file, width: img.width, height: img.height, ...(exp.has(id) && { linkage: exp.get(id) }) });
        break;
      }
      case T.DefineText: case T.DefineText2: {
        const { records, ...rest } = readText(t, fontMap);
        const text = records.map((r, i) => (i && r.y !== undefined ? "\r" : "") + r.text).join("");
        texts.push({ ...rest, tag: TAG_NAME[t.code]!, usedIn: [], text, records });
        break;
      }
      case T.DefineEditText:
        texts.push({ ...readEditText(t), tag: "DefineEditText", usedIn: [] });
        break;
    }
  }
  if (texts.length) {
    const parents = parentMap(swf);
    for (const x of texts) x.usedIn = exportedAncestors(x.id, parents, exp);
    textFiles.push({ swf: p, texts });
    await write(`texts/${p}.json`, { swf: p, texts });
  }
}

// A family declared by @font-face hides the system font of the same name, so each name/style first gets a
// full-range local() face (defined first = checked last); embedded subsets follow, sorted by glyph count so
// the fullest subset is defined last (= checked first by the browser).
const face = (name: string, bold: boolean, italic: boolean, src: string, range = "") =>
  `@font-face {\n  font-family: "${name}";\n  src: ${src};\n  font-weight: ${bold ? "bold" : "normal"};\n  font-style: ${italic ? "italic" : "normal"};\n${range && `  unicode-range: ${range};\n`}}\n`;
const styles = new Map<string, Font>();
for (const f of allFonts) if (!f.name.startsWith("_")) styles.set(`${f.name.toLowerCase()}|${f.bold}|${f.italic}`, f);
const css = [
  ...[...styles.values()].map((f) => face(f.name, f.bold, f.italic, `local("${[f.name, f.bold && "Bold", f.italic && "Italic"].filter(Boolean).join(" ")}")`)),
  ...[...faces.values()].sort((a, b) => a.font.codes.length - b.font.codes.length).map(({ font, file }) =>
    face(font.name, font.bold, font.italic, `url("${file}.woff") format("woff"), url("${file}.ttf") format("truetype")`, unicodeRange(font.codes))),
];
await write("fonts.css", "/* Generated by scripts/assets-media/extract.ts — fonts embedded in dofus-5b SWFs (DefineFont2). */\n" + css.join(""));
await write("fonts.json", fonts);
await write("sounds.json", sounds);
await write("bitmaps.json", bitmaps);
await write("texts/index.json", textFiles.map((f) => `texts/${f.swf}.json`));
rmSync(WORK, { recursive: true, force: true });
await updateDoc();

const count = (o: Record<string, unknown[] | Record<number, unknown>>) => Object.values(o).reduce((n, v) => n + Object.keys(v).length, 0);
console.log(`sounds ${Object.keys(sounds).length}, fonts ${count(fonts)} (${faces.size} unique embedded faces), bitmaps ${count(bitmaps)}, texts ${textFiles.reduce((n, f) => n + f.texts.length, 0)} in ${textFiles.length} SWFs`);
const bad = Object.entries(sounds).filter(([, s]) => {
  const { duration, declaredDuration } = s as { duration: number; declaredDuration: number };
  return Math.abs(duration - declaredDuration) > 0.05 * declaredDuration + 0.03;
});
if (bad.length) console.warn("duration mismatch (ffprobe vs DefineSound sampleCount):", bad.map(([k]) => k).join(", "));

function deviceFallback(name: string) {
  const alias: Record<string, string> = { _sans: "sans-serif", _serif: "serif", _typewriter: "monospace" };
  return alias[name] ?? `"${name}", ${/times|serif/i.test(name) ? "serif" : "sans-serif"}`;
}

function unicodeRange(codes: number[]) {
  const s = [...new Set(codes)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (s[j + 1] === s[j]! + 1) j++;
    const h = (n: number) => n.toString(16).toUpperCase();
    out.push(i === j ? `U+${h(s[i]!)}` : `U+${h(s[i]!)}-${h(s[j]!)}`);
    i = j;
  }
  return out.join(", ");
}

/** characterId -> ids of sprites/buttons that place it (0 = main timeline). */
function parentMap(swf: Swf) {
  const m = new Map<number, Set<number>>();
  const add = (child: number, parent: number) => (m.get(child) ?? m.set(child, new Set()).get(child)!).add(parent);
  for (const t of swf.tags) {
    if (t.code === 26 && t.data[0]! & 0x02) add(t.data[3]! | (t.data[4]! << 8), t.sprite); // PlaceObject2
    if (t.code === 4) add(charId(t), t.sprite); // PlaceObject
    if (t.code === T.DefineButton2) {
      const r = new Reader(t.data);
      const id = r.u16(); r.u8(); r.u16();
      for (let flags = r.u8(); flags !== 0; flags = r.u8()) {
        add(r.u16(), id); r.u16(); r.matrix();
        const hasAdd = r.ub(1), hasMult = r.ub(1), n = r.ub(4); // CXFORMWITHALPHA
        for (let k = (hasMult + hasAdd) * 4; k > 0; k--) r.sb(n);
        r.align();
      }
    }
  }
  return m;
}

/** Nearest exported (linkage) ancestors of a character; "(root)" if it reaches the main timeline unexported. */
function exportedAncestors(id: number, parents: Map<number, Set<number>>, exp: Map<number, string>) {
  const out = new Set<string>();
  const seen = new Set<number>();
  const visit = (c: number) => {
    if (seen.has(c)) return;
    seen.add(c);
    for (const p of parents.get(c) ?? []) {
      if (p === 0) out.add("(root)");
      else if (exp.has(p)) out.add(exp.get(p)!);
      else visit(p);
    }
  };
  visit(id);
  return [...out];
}

/** Rewrites the generated string list between markers in docs/assets-media.md. */
async function updateDoc() {
  const lines = ["<!-- french-strings:start (generated by scripts/assets-media/extract.ts) -->", ""];
  for (const { swf, texts } of textFiles) {
    const nonEmpty = texts.filter((x) => x.text.trim());
    if (!nonEmpty.length) continue;
    lines.push(`### \`${swf}\` (${nonEmpty.length} of ${texts.length} text fields non-empty)`, "");
    for (const x of nonEmpty) {
      const where = [x.tag, x.variable ? `var \`${x.variable}\`` : "", x.usedIn.length ? `in ${x.usedIn.map((u) => `\`${u}\``).join(", ")}` : ""].filter(Boolean).join(", ");
      lines.push(`- **#${x.id}** (${where})`);
      lines.push("  ```text", ...x.text.trimEnd().split(/\r\n?|\n/).map((l) => "  " + l), "  ```");
    }
    lines.push("");
  }
  lines.push("<!-- french-strings:end -->");
  const doc = await Bun.file(DOC).text();
  const updated = doc.replace(/<!-- french-strings:start[\s\S]*<!-- french-strings:end -->/, lines.join("\n"));
  if (updated === doc && !doc.includes("french-strings:start")) throw new Error(`${DOC}: markers missing`);
  await Bun.write(DOC, updated);
}
