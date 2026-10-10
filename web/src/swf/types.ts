// Converted SWF format `dofus-swf-json` v1 — semantics in docs/assets-format.md.

export type Rect = [xMin: number, yMin: number, xMax: number, yMax: number];
export type Matrix = [a: number, b: number, c: number, d: number, tx: number, ty: number];
export type RGBA = [r: number, g: number, b: number, a: number];
export type ColorTransform = [rMul: number, gMul: number, bMul: number, aMul: number, rAdd: number, gAdd: number, bAdd: number, aAdd: number];

export type Fill =
  | { type: "solid"; color: RGBA }
  | { type: "linear" | "radial"; matrix: Matrix; stops: { ratio: number; color: RGBA }[] }
  | { type: "bitmap"; bitmap: number; matrix: Matrix; repeat: boolean; smooth: boolean };
export type Line = { width: number; color: RGBA };

export type ShapePath = { fill: Fill; d: string } | { line: Line; d: string };
export type MorphPath = { fill: [Fill, Fill]; d: [string, string] } | { line: [Line, Line]; d: [string, string] };

export type ClipEvent =
  | "load" | "enterFrame" | "unload" | "mouseMove" | "mouseDown" | "mouseUp" | "keyDown" | "keyUp" | "data"
  | "initialize" | "press" | "release" | "releaseOutside" | "rollOver" | "rollOut" | "dragOver" | "dragOut"
  | "keyPress" | "construct";
export type ClipAction = { events: ClipEvent[]; key?: number; bytecode: string };

export type DisplayOp =
  | {
      op: "place";
      depth: number;
      id?: number;
      move?: true;
      matrix?: Matrix;
      cxform?: ColorTransform;
      ratio?: number;
      name?: string;
      clipDepth?: number;
      clipActions?: ClipAction[];
    }
  | { op: "remove"; depth: number };

export type StartSound = {
  id: number;
  stop?: true;
  noMultiple?: true;
  loops?: number;
  inPoint?: number;
  outPoint?: number;
  envelope?: [pos44: number, left: number, right: number][];
};

export type Frame = {
  label?: string;
  ops?: DisplayOp[];
  actions?: string[];
  initActions?: { id: number; bytecode: string }[];
  sounds?: StartSound[];
};
export type Timeline = { frameCount: number; frames: Frame[] };

export type ButtonCondition =
  | "idleToOverUp" | "overUpToIdle" | "overUpToOverDown" | "overDownToOverUp" | "outDownToIdle"
  | "overDownToOutDown" | "outDownToOverDown" | "idleToOverDown" | "overDownToIdle";
export type ButtonState = "up" | "over" | "down" | "hit";

export type ShapeSymbol = { type: "shape"; id: number; bounds: Rect; paths: ShapePath[] };
export type MorphSymbol = { type: "morph"; id: number; bounds: [Rect, Rect]; paths: MorphPath[] };
export type SpriteSymbol = { type: "sprite"; id: number } & Timeline;
export type ButtonSymbol = {
  type: "button";
  id: number;
  trackAsMenu: boolean;
  records: { states: ButtonState[]; id: number; depth: number; matrix: Matrix; cxform?: ColorTransform }[];
  actions: { conditions: ButtonCondition[]; key?: number; bytecode: string }[];
};
export type TextSymbol = {
  type: "text";
  id: number;
  bounds: Rect;
  matrix: Matrix;
  records: { font: number; size: number; color: RGBA; x: number; y: number; glyphs: [index: number, advance: number][] }[];
};
export type EditTextSymbol = {
  type: "edittext";
  id: number;
  bounds: Rect;
  variable?: string;
  text?: string;
  html: boolean;
  font?: number;
  size?: number;
  color?: RGBA;
  maxLength?: number;
  align?: "left" | "right" | "center" | "justify";
  leftMargin?: number;
  rightMargin?: number;
  indent?: number;
  leading?: number;
  wordWrap: boolean;
  multiline: boolean;
  password: boolean;
  readOnly: boolean;
  selectable: boolean;
  border: boolean;
  autoSize: boolean;
  useOutlines: boolean;
};
export type FontSymbol = {
  type: "font";
  id: number;
  name: string;
  bold: boolean;
  italic: boolean;
  glyphs: { code: number; d: string; advance?: number }[];
  ascent?: number;
  descent?: number;
  leading?: number;
};
export type BitmapSymbol = { type: "bitmap"; id: number; width: number; height: number; file: string };
export type SoundSymbol = { type: "sound"; id: number; format: number; rate: number; is16Bit: boolean; stereo: boolean; samples: number };

export type SwfSymbol =
  | ShapeSymbol | MorphSymbol | SpriteSymbol | ButtonSymbol | TextSymbol | EditTextSymbol | FontSymbol | BitmapSymbol | SoundSymbol;

export type SwfFile = {
  format: "dofus-swf-json";
  formatVersion: 1;
  src: string;
  version: number;
  width: number;
  height: number;
  frameRate: number;
  background: string | null;
  root: Timeline;
  symbols: Record<string, SwfSymbol>;
  exports: Record<string, number>;
  imports: { url: string; items: { name: string; id: number }[] }[];
};

export type SwfIndex = {
  format: "dofus-swf-index";
  formatVersion: 1;
  files: {
    src: string;
    json: string;
    version: number;
    width: number;
    height: number;
    frameRate: number;
    frameCount: number;
    symbols: number;
    bitmaps: number;
    exports: number;
    warnings?: string[];
  }[];
  failures: { src: string; error: string }[];
};
