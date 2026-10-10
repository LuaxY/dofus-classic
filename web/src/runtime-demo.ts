// Runtime demo (web/runtime-demo.html): a character sprite playing its animations on the 742×550 stage.
// ←/→ direction, ↑/↓ animation, space or click = cast with spell 903. Mirrors Character.setAnim/wait
// (AKSClient/Dofus.BattleField.Characters.Character.as:707-765) with stand-ins for WEAPONS and SOMA.
import { browserLoader } from "./swf/render.ts";
import { _global, browserAudio, Color, Key, Player, Sound, TextFormat, type MovieClip } from "./runtime/player.ts";

const canvas = document.getElementById("stage") as HTMLCanvasElement;
const select = document.getElementById("sprite") as HTMLSelectElement;
const p = new Player({ loader: browserLoader(), audio: browserAudio() });

_global.SOMA = { playSound: (name: string) => { const s = new Sound(); s.attachSound(name); s.start(); } };
_global.WEAPONS = {
  applyWeapon(obj: MovieClip, side: string) {
    const name = obj.$.swf?.file.imports[0]?.items[0]?.name;
    if (!name) return;
    (obj.clip as MovieClip | undefined)?.removeMovieClip();
    (obj.attachMovie(name, "clip", 10) as MovieClip | undefined)?.gotoAndStop(side);
  },
};

const ANIMS = ["static", "Walk", "Run", "cast", "shoot", "hit", "bonus", "die"];
let dir = 0, anim = 0, spells = 0;
const sprite = p.root.createEmptyMovieClip("sprite", 1);
sprite._x = 371;
sprite._y = 330;
const clip = sprite.createEmptyMovieClip("clip", 2);
const ctrl = {
  data: { SEQUENCER_anim: { onActionEnd: () => {} } },
  wait: () => setAnim(0),
};
sprite._ACTION = sprite._OBJECT = ctrl;

const help = p.root.createTextField("help", 10, 10, 10, 722, 60);
help.wordWrap = help.multiline = true;
help.html = true;
const fmt = Object.assign(new TextFormat(), { font: "Verdana", size: 12, color: 0x203040 });
help.setNewTextFormat(fmt);

function setAnim(i: number) {
  anim = (i + ANIMS.length) % ANIMS.length;
  clip.gotoAndStop(ANIMS[anim] + (dir < 2 ? "R" : "L"));
  clip._xscale = dir % 2 ? -100 : 100;
  clip.playFirstChildren();
  help.htmlText = `<b>${select.value}</b> — anim <font color="#cc3300">${ANIMS[anim]}</font>, dir ${dir}, root frame ${clip._currentframe}<br>←/→ direction · ↑/↓ animation · space or click: cast + spell 903`;
}
function cast() {
  setAnim(ANIMS.indexOf("cast"));
  const s = p.root.createEmptyMovieClip("spell" + spells, 100 + (spells++ % 20));
  s._x = sprite._x + (dir % 2 ? -60 : 60);
  s._y = sprite._y;
  s._ACTION = ctrl;
  s.createEmptyMovieClip("clip", 1).loadMovie("clips/spells/903.swf");
}
function load() {
  clip.onInitFrame = () => setAnim(0);
  clip.loadMovie(select.value);
}

sprite.onRelease = cast;
sprite.onRollOver = () => new Color(clip).setTransform({ ra: 60, rb: 100, ga: 60, gb: 100, ba: 60, bb: 100 });
sprite.onRollOut = sprite.onReleaseOutside = () => new Color(clip).setTransform({ ra: 100, rb: 0, ga: 100, gb: 0, ba: 100, bb: 0 });
Key.addListener({
  onKeyDown() {
    const k = Key.getCode();
    if (k === 37 || k === 39) (dir = (dir + (k === 39 ? 1 : 3)) % 4), setAnim(anim);
    if (k === 38 || k === 40) setAnim(anim + (k === 38 ? 1 : -1));
    if (k === 32) cast();
  },
});
select.addEventListener("change", load);
for (const n of [10, 11, 20, 21, 30, 31, 40, 41, 50, 51, 60, 61, 70, 71, 80, 81, 90, 91, 100, 101, 1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007])
  select.add(new Option(`clips/sprites/${n}.swf`, `clips/sprites/${n}.swf`));
load();
p.start(canvas);
