// AKSClient/DialogBubbleSymbol.as (`DialogBubbleSymbol`: speech bubble in Container.Text) and
// AKSClient/SmileyOverHead.as + __Packages/dofus/graphics/battlefield/character/SmileyOverHead.as (`SmileyOverHead`:
// smiley above a character). docs/logic/characters.md §7.
import { Constants } from "../../core/constants.ts";
import { clearInterval, MovieClip, registerClass, setInterval, TextFormat, type TextField } from "../../runtime/player.ts";
import { deps } from "./deps.ts";

export class DialogBubble extends MovieClip {
  declare txtf: TextField;
  declare rayon: number;
  declare txt: string;
  declare txtFormat: TextFormat;
  declare intervalID: number;
  declare bubble: MovieClip;

  /**
   * DialogBubbleSymbol.as:1-16. The AS1 constructor is `function(textAlign)`, but registered classes are built by
   * attachMovie without arguments: `textAlign` is always undefined, and the `{align}` initObject that
   * Character.say passes (Character.as:362) lands in `this.align`, which nothing reads.
   */
  constructor() {
    super();
    const textAlign = undefined;
    this.createTextField("txtf", 2, 0, 0, 150, 0);
    this.rayon = 18;
    this.txt = "";
    this.txtFormat = new TextFormat();
    Object.assign(this.txtFormat, { font: "Font1", size: 10, align: textAlign, bold: false, italic: false, color: 0x000000 }); // AS: color "0x000000"
  }

  /** DialogBubbleSymbol.as:19-43 — scale-in 80 → 105 → 100 %, removed after 5 s + 10 ms per character. */
  setText(txt: string): void {
    this._alpha = 100;
    this._xscale = this._yscale = 80;
    this.onEnterFrame = function (this: DialogBubble) {
      this._xscale = this._yscale += 25;
      if (this._xscale > 125) {
        this._xscale = this._yscale = 100;
        delete this.onEnterFrame;
      }
    };
    this.txt = txt;
    this.drawText(this.rayon / 2, this.rayon / 2, this.txt);
    const height = this.txtf.textHeight > 10 ? this.txtf.textHeight : 11;
    const width = this.txtf.textWidth > 10 ? this.txtf.textWidth + 4 : 11;
    this.drawBubble(width, height, this.rayon);
    this.bubble._y -= this.bubble._height;
    this.txtf._y -= this.bubble._height;
    clearInterval(this.intervalID);
    this.intervalID = setInterval(this, "remove", 5000 + 10 * txt.length);
  }

  /** DialogBubbleSymbol.as:44-63 — rounded box (0xFFFFCE, outline 0x4B4B4B) and the `BubblePic` tail. */
  drawBubble(width: number, height: number, rayon: number): void {
    const b = this.createEmptyMovieClip("bubble", 1);
    b.lineStyle(1, "0x4B4B4B", 100);
    b.beginFill("0xFFFFCE", 100);
    b.moveTo(rayon, 0);
    b.lineTo(width, 0);
    b.curveTo(width + rayon, 0, width + rayon, rayon);
    b.lineTo(width + rayon, height);
    b.curveTo(width + rayon, height + rayon, width, height + rayon);
    b.lineTo(rayon, height + rayon);
    b.curveTo(0, height + rayon, 0, height);
    b.lineTo(0, rayon);
    b.curveTo(0, 0, rayon, 0);
    b.endFill();
    b.attachMovie("BubblePic", "pic", 1, { _x: 0, _y: height + rayon + 13 });
  }

  /** DialogBubbleSymbol.as:64-76 */
  drawText(x: number, y: number, txt: string): void {
    const t = this.txtf;
    t.selectable = false;
    t.autoSize = "left";
    t.wordWrap = true;
    t.setHtmlText(txt);
    t.embedFonts = true;
    t.setTextFormat(this.txtFormat);
    t._x = x;
    t._y = y - 2;
  }

  /** DialogBubbleSymbol.as:77-89 */
  flipH(): void {
    this.txtf._x = this.bubble._xscale <= 0 ? this.rayon / 2 : -this.bubble._width + this.rayon / 2;
    this.bubble._xscale *= -1;
  }
  flipV(): void {
    this.bubble._yscale *= -1;
    this.bubble._y = this.bubble._yscale <= 0 ? this.bubble._height : -this.bubble._height;
    this.txtf._y = this.bubble._yscale <= 0 ? this.rayon / 2 + 10 : -this.bubble._height + (this.rayon / 2 - 2);
  }

  /** DialogBubbleSymbol.as:90-117 */
  flipLeft(): void {
    if (this.bubble._xscale > 0) this.flipH();
  }
  flipRight(): void {
    if (this.bubble._xscale < 0) this.flipH();
  }
  flipTop(): void {
    if (this.bubble._yscale < 0) this.flipV();
  }
  flipBottom(): void {
    if (this.bubble._yscale > 0) this.flipV();
  }

  /** DialogBubbleSymbol.as:118-122 */
  remove(): void {
    clearInterval(this.intervalID);
    this.removeMovieClip();
  }
}
registerClass("DialogBubbleSymbol", DialogBubble);

/**
 * __Packages/dofus/graphics/battlefield/character/SmileyOverHead.as (AS2 class, registered by AKSClient/SmileyOverHead.as).
 * The AS2 constructor takes `character`, which attachMovie never passes (`_character` stays undefined). Loading goes
 * through `ank::SWFLoader` and the timer through `ank.Timer` (owner C).
 */
export class SmileyOverHead extends MovieClip {
  declare _character: unknown;
  declare simley_mc: MovieClip;

  constructor() {
    super();
    this._character = undefined;
    this.initialize();
  }

  /** SmileyOverHead.as:11-15 */
  initialize(): void {
    this.createEmptyMovieClip("simley_mc", 10);
    this.simley_mc.attachMovie("ank::SWFLoader", "swfLoader_mc", 10);
  }

  /** SmileyOverHead.as:16-40 — frame `smileyID` of clips/smileys.swf, scale-in 40 % per frame, removed after SMILEY_DELAY. */
  drawSmiley(smileyID: number): void {
    (this.simley_mc.swfLoader_mc as { loadSWF?(file: string, frame: number): void } | undefined)?.loadSWF?.(Constants.SMILEY_FILE, smileyID);
    let i = 0;
    this.onEnterFrame = function (this: SmileyOverHead) {
      if (i >= 100) {
        this.simley_mc._xscale = this.simley_mc._yscale = 100;
        delete this.onEnterFrame;
      } else {
        i += 40;
        this.simley_mc._xscale = this.simley_mc._yscale = i;
        if (i >= 100) i = 100;
      }
    };
    deps.ank?.Timer.setTimer(this, this.remove, Constants.SMILEY_DELAY);
  }

  /** SmileyOverHead.as:41-44 */
  remove(): void {
    this.removeMovieClip();
  }
}
registerClass("SmileyOverHead", SmileyOverHead);
