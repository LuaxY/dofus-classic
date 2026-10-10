// In-fight widgets of modules/Interfaces.swf: life/AP counters, chronos, turn timeline, player head, next-turn box,
// team watcher. Each class keeps its AS1 constructor name; sources under decompiled/clean/modules_Interfaces/.
import { GUILDS_FACES_PATH, TEAMS_COLOR } from "../../../core/constants.ts";
import type { Character } from "../../../core/datacenter/index.ts";
import { str, toNumber } from "../../../core/swf6.ts";
import { clearInterval, Color, MovieClip, registerClass, setInterval } from "../../../runtime/player.ts";
import { G } from "../../globals.ts";
import { T, type Txt } from "./as.ts";

/** `Interface.Heart.as` */
export class Class_InterfaceBannerHeart extends MovieClip {
  declare txtLifePoint: Txt;
  declare levelMeter?: MovieClip;
  setLifePoints(lp: unknown, max: unknown) {
    if (this.txtLifePoint) this.txtLifePoint.text = str(lp);
    if (this.levelMeter) this.levelMeter._yscale = (toNumber(lp) / toNumber(max)) * 100;
  }
}
registerClass("Interface::Heart", Class_InterfaceBannerHeart);

/** `Interface.ActionPoints.as` */
export class Class_InterfaceActionPoints extends MovieClip {
  declare txtActionPoints: Txt;
  setActionPoints(ap: unknown) {
    if (this.txtActionPoints) this.txtActionPoints.text = str(ap);
  }
}
registerClass("Interface::ActionPoints", Class_InterfaceActionPoints);

type Half = MovieClip & { mask?: MovieClip };
/** `Interface.Chrono.as`: two half-disc masks rotated by the elapsed fraction, digits under 6 s. */
export class Class_Interface_Chrono extends MovieClip {
  declare half1?: Half;
  declare half2?: Half;
  declare txtTimer: Txt;
  declare roundMask?: MovieClip;
  declare maxTime: number;
  declare timerValue: number;
  declare intervalID: unknown;
  constructor() {
    super();
    this.init();
  }
  init() {
    this.stopTimer();
  }
  startTimer(t: number) {
    this.maxTime = t;
    this.timerValue = t;
    this.updateTimer();
    clearInterval(this.intervalID);
    this.intervalID = setInterval(this, "updateTimer", 1000);
    const pm = this._parent?.roundMask as MovieClip | undefined; // Chrono.as:19 hides the parent's roundMask (none in sprite 791)
    if (pm) pm._visible = false;
  }
  updateTimer() {
    const a = 360 - (this.timerValue / this.maxTime) * 360;
    const [m1, m2] = [this.half1?.mask, this.half2?.mask];
    if (a < 180) {
      if (m1) m1._rotation = a;
      if (m2) m2._rotation = 0;
    } else {
      if (m1) m1._rotation = 180;
      if (m2) m2._rotation = a - 180;
    }
    if (this.timerValue <= 5) {
      this.txtTimer?.setText(this.timerValue, "Font2");
      if (this.roundMask) this.roundMask._visible = true;
    }
    this.timerValue = this.timerValue - 1;
    if (this.timerValue < 0) this.stopTimer();
  }
  stopTimer() {
    if (this.half1?.mask) this.half1.mask._rotation = 0;
    if (this.half2?.mask) this.half2.mask._rotation = 0;
    if (this.txtTimer) this.txtTimer.text = "";
    if (this.roundMask) this.roundMask._visible = false;
    clearInterval(this.intervalID);
  }
}
registerClass("Interface::Chrono", Class_Interface_Chrono);

/** `Interface.ChronoVerti.as`: vertical bar mask of a timeline item. */
export class Class_Interface_ChronoVerti extends MovieClip {
  declare RectMask?: MovieClip;
  declare txtTimer: Txt;
  declare height: number;
  declare maxTime: number;
  declare timerValue: number;
  declare intervalID: unknown;
  constructor() {
    super();
    this.init();
  }
  init() {
    this.height = toNumber(this.RectMask?._height);
    this.stopTimer();
  }
  startTimer(t: number) {
    this.maxTime = t;
    this.timerValue = t;
    this.updateTimer();
    clearInterval(this.intervalID);
    this.intervalID = setInterval(this, "updateTimer", 1000);
  }
  updateTimer() {
    if (this.RectMask) this.RectMask._height = this.height - (this.timerValue / this.maxTime) * this.height;
    if (this.timerValue < 6 && this.txtTimer) this.txtTimer.text = str(this.timerValue);
    this.timerValue = this.timerValue - 1;
    if (this.timerValue < 0) this.stopTimer();
  }
  stopTimer() {
    if (this.RectMask) this.RectMask._height = 0;
    if (this.txtTimer) this.txtTimer.text = "";
    clearInterval(this.intervalID);
  }
}
registerClass("Interface::ChronoVerti", Class_Interface_ChronoVerti);

/** `Interface.Timeline.MoveArrow.as`: the marker slides with i² easing. */
export class Class_Timeline_MoveArrow extends MovieClip {
  declare destX: number | undefined;
  clear() {
    delete this.destX;
    this._x = 0;
  }
  move(destX: number) {
    const dir = destX <= this._x ? -1 : 1;
    let i = 0;
    this.destX = destX;
    this.onEnterFrame = () => {
      i++;
      this._x += i * i * dir;
      if (this._x * dir > toNumber(this.destX) * dir) {
        this._x = toNumber(this.destX);
        delete this.onEnterFrame;
      }
    };
  }
}
registerClass("Interface::Timeline::MoveArrow", Class_Timeline_MoveArrow);

/** `Interface.Timeline.as`: one `Interface::TimelineItem` per fighter of `DATACENTER.Game.turnSequence`, 28 px apart. */
export class Class_Interface_Timeline extends MovieClip {
  declare marker?: Class_Timeline_MoveArrow;
  declare items?: MovieClip;
  declare chrono?: Class_Interface_ChronoVerti;
  declare currentPlayerIndex: number | null;
  declare currentDisplayIndex: number;
  declare sequenceLength: number | null;
  declare itemsList: unknown[];
  declare characList: (Character | undefined)[];
  constructor() {
    super();
    this.init();
  }
  init() {
    this.activate(false);
    this.currentPlayerIndex = null;
    this.currentDisplayIndex = 0;
    this.sequenceLength = null;
    this.itemsList = [];
  }
  activate(bool: boolean) {
    if (bool) {
      if (this.marker) this.marker._visible = true;
      this.generate();
    } else {
      if (this.marker) this.marker._visible = false;
      this.items?.removeMovieClip();
    }
  }
  nextTurn(characID: unknown) {
    const item = this.items?.[`item${str(characID)}`] as Class_Interface_TimelineItem | undefined;
    this.chrono = item?.Chrono;
    this.marker?.move(toNumber(item?._x));
  }
  generate() {
    const cs = G.DATACENTER.Game.turnSequence;
    this.characList = [];
    for (let i = 0; i < cs.length; i++) this.characList.push(G.DATACENTER.Characters.getItemAt(cs[i]!));
    this.sequenceLength = this.characList.length; // `characlist` (Timeline.as:49) is `characList` (SWF 6)
    this.currentPlayerIndex = -1;
    this.items?.removeMovieClip();
    const items = this.createEmptyMovieClip("items", 1);
    items._visible = false;
    for (let i = 0; i < this.sequenceLength; i++) {
      const c = this.characList[i];
      items.attachMovie("Interface::TimelineItem", `item${str(c?.num)}`, i, { _x: i * 28, index: i, data: c });
    }
    items._visible = true;
  }
  removePlayer(characID: unknown) {
    const item = this.items?.[`item${str(characID)}`] as MovieClip | undefined;
    new Color(item?.sprite).setRGB(0);
  }
}
registerClass("Interface::Timeline", Class_Interface_Timeline);

type RollClip = { sprite?: { onRollOver?: () => void; onRollOut?: () => void } };
/** `Interface.TimelineItem.as`: mirrored, masked fighter sprite with its vertical chrono. */
export class Class_Interface_TimelineItem extends MovieClip {
  declare data: Character | undefined; // initObject
  declare sprite: MovieClip;
  declare backRect?: MovieClip;
  declare Chrono?: Class_Interface_ChronoVerti;
  constructor() {
    super();
    this.init();
  }
  init() {
    const s = this.createEmptyMovieClip("sprite", 1);
    s.onInitFrame = function (this: MovieClip) {
      this.gotoAndStop("staticR");
      this.stopAllClip();
      this._y = 48;
      this._x = 15;
      this._xscale = -90;
      this._yscale = 90;
      this.setMask(this._parent?.maskRect as MovieClip);
    };
    s.loadMovie(str(this.data?.file));
    G.CCOLORS.addCharacter(s);
    G.CCOLORS.setColor(s._target, this.data?.color1, this.data?.color2, this.data?.color3);
    this.attachMovie("MaskRect", "maskRect", 2);
    this.attachMovie("Interface::ChronoVerti", "Chrono", 10, { _x: 2, _y: 2 });
  }
  onRollOver() {
    if (this.backRect) this.backRect._alpha = 50;
    (this.data?.clip as RollClip | null | undefined)?.sprite?.onRollOver?.();
  }
  onRollOut() {
    if (this.backRect) this.backRect._alpha = 100;
    (this.data?.clip as RollClip | null | undefined)?.sprite?.onRollOut?.();
  }
}
registerClass("Interface::TimelineItem", Class_Interface_TimelineItem);

/** `Interface.PlayerCircle.as`: the player's face (`GUILDS_FACES_PATH + gfxID`) in the banner. */
export class Class_Interface_PlayerCircle extends MovieClip {
  declare headClip?: MovieClip;
  constructor() {
    super();
    this.init();
  }
  init() {
    this.setFace();
  }
  setFace() {
    const c = G.DATACENTER.Characters.getItemAt(G.DATACENTER.Player.ID ?? NaN);
    this.headClip?.loadMovie(GUILDS_FACES_PATH + str(c?.gfxID) + ".swf");
    const d = G.DATACENTER.Player.data;
    G.CCOLORS.addCharacter(this.headClip);
    G.CCOLORS.setColor(str(this.headClip?._target), d?.color1, d?.color2, d?.color3);
  }
  setAnim(anim: string) {
    this.headClip?.gotoAndStop(anim);
  }
}
registerClass("Interface::PlayerCircle", Class_Interface_PlayerCircle);

/** `Interface.NextTurn.as` */
export class Class_Interface_NextTurn extends MovieClip {
  declare txtNextPlayer: Txt;
  constructor() {
    super();
    this.txtNextPlayer?.setText(T("NEXT_PLAYER"));
  }
}
registerClass("Interface::NextTurn", Class_Interface_NextTurn);

/** `Interface.TeamWatcher.as`: placement-phase team cards (team 0 right-to-left of 0, team 1 from +10). */
export class Class_TeamWatcher extends MovieClip {
  declare CHARAC_WIDTH: number;
  declare CHARAC_HEIGHT: number;
  declare HALF_TEAM_INTERVAL: number;
  declare background_mc?: MovieClip;
  constructor() {
    super();
    this.CHARAC_WIDTH = 90;
    this.CHARAC_HEIGHT = 120;
    this.HALF_TEAM_INTERVAL = 10;
    this.init();
  }
  init() {
    new Color(this.background_mc?.team0Color_mc).setRGB(TEAMS_COLOR[0]);
    new Color(this.background_mc?.team1Color_mc).setRGB(TEAMS_COLOR[1]);
  }
  hide() {
    this.removeMovieClip();
  }
  setTeams(team0: Character[], team1: Character[]) {
    for (const [n, team, depth] of [[0, team0, 10], [1, team1, 20]] as const) {
      const mc = this.createEmptyMovieClip(`team${n}_mc`, depth);
      mc._x = n === 0 ? -this.CHARAC_WIDTH * team.length - this.HALF_TEAM_INTERVAL : this.HALF_TEAM_INTERVAL;
      team.forEach((c, i) =>
        mc.attachMovie("Interface::TeamWatcherCharacter", `charac${str(c.num)}`, i, {
          _x: i * this.CHARAC_WIDTH, data: c, team: n, width: this.CHARAC_WIDTH, height: this.CHARAC_HEIGHT,
        }));
    }
  }
}
registerClass("Interface::TeamWatcher", Class_TeamWatcher);

/** `Interface.TeamWatcherCharacter.as` */
export class Class_TeamWatcherCharacter extends MovieClip {
  declare data: Character; // initObject: data, team, width, height
  declare team: number;
  declare width: number;
  declare height: number;
  declare clip: MovieClip;
  declare name_txt: Txt;
  declare level_txt: Txt;
  constructor() {
    super();
    this.init();
  }
  init() {
    const clip = this.createEmptyMovieClip("clip", 10);
    // AS bug kept (TeamWatcherCharacter.as:11-14): onInitFrame is set on the card, not on `clip`, so the loaded
    // sprite is never stopped on "staticR" (it fires next frame on the attached card, which has no such label: no-op).
    this.onInitFrame = function (this: MovieClip) {
      this.gotoAndStop("staticR");
    };
    clip.loadMovie(str(this.data?.file));
    clip._x = this.width / 2;
    clip._y = this.height / 2 + 10;
    if (this.team == 1) clip._xscale *= -1;
    G.CCOLORS.addCharacter(clip);
    G.CCOLORS.setColor(clip._target, this.data?.color1, this.data?.color2, this.data?.color3);
    G.WEAPONS.addCharacter(clip);
    G.WEAPONS.setData(clip._target, this.data);
    this.name_txt?.setText(this.data?.name, "Font2");
    this.level_txt?.setText(T("LEVEL") + " " + str(this.data?.level), "Font1");
  }
}
registerClass("Interface::TeamWatcherCharacter", Class_TeamWatcherCharacter);
