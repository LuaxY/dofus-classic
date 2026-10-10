// modules/Sound.swf (`_global.SOMA`): modules_Sound/Dofus.Sound.Manager.as, Dofus.Sound.ParamsManager.as,
// Dofus.Sound.Params.as, Dofus.Sound.Event.as, on the runtime's Sound.
// The four #initclip blocks never run (DoInitAction is game code); `soundSwfInit` replays them, in tag order
// (ParamsManager → Manager → Params → Event), from the scriptHook of Sound.swf's root frame 1 (empty DoAction),
// i.e. one frame after the SWF arrives instead of just before — SOMA is undefined until then either way.
import { MovieClip, registerClass, SharedObject, Sound } from "../../runtime/player.ts";
import { G } from "../globals.ts";

declare module "../globals.ts" {
  interface Globals {
    SOMA: SoundManager | undefined;
    BOUCLE_INFINIE: number;
    MUSIC_FIGHT: string[];
  }
}

/** A Sound with the dynamic members Manager.as:140-158,176-191 put on it. */
export class GameSound extends Sound {
  file?: string;
  volume = 100;
  boucle?: number;
  mc?: MovieClip;
  onFinish?: () => void;
  play(): void {
    this.start(0, this.boucle);
    this.setVolume(this.volume);
  }
}
type SoundClip = MovieClip & { s?: GameSound };

/** Dofus.Sound.ParamsManager.as. Port: `params` is a plain object instead of an empty clip (only used as a map). */
export class SoundParamsManager extends MovieClip {
  declare params: Record<string, { file: string; volume: number }>;
  constructor() {
    super();
    this.params = {};
  }
  addParams(file: string, volume: number): void {
    this.params[file] = { file, volume };
  }
  getParams(file: string): { file: string; volume: number } | undefined {
    return this.params[file];
  }
}
registerClass("Dofus::Sound::ParamsManager", SoundParamsManager);

/** Dofus.Sound.Manager.as (Class_Sound_Manager) + the event functions Dofus.Sound.Event.as assigns onto SOMA. */
export class SoundManager extends MovieClip {
  declare COOKIE_NAME: string;
  declare current_sound_id: number;
  declare bMuteSound: boolean;
  declare bMuteMusic: boolean;
  declare volumeMusic: number;
  declare volumeSound: number;
  declare mc_sound: SoundClip;
  declare mc_music: SoundClip;
  declare paramsManager: SoundParamsManager;

  constructor() {
    super();
    this.COOKIE_NAME = "DofusSO";
    this.init();
  }

  /** :8-11 — first id 0 (SWF 6: undefined++ yields 0). */
  getSoundID(): number {
    return (this.current_sound_id = (this.current_sound_id ?? 0) + 1) - 1;
  }

  /** :12-26 */
  setMuteSound(bool: boolean): void {
    SharedObject.getLocal(this.COOKIE_NAME).data.muteSound = bool;
    if (bool == true) for (const c of Object.values(this.mc_sound)) if (c instanceof MovieClip && (c as SoundClip).s) this.stopSound((c as SoundClip).s!);
    this.bMuteSound = bool;
  }

  /** :27-42 */
  setMuteMusic(bool: boolean): void {
    SharedObject.getLocal(this.COOKIE_NAME).data.muteMusic = bool;
    if (bool == true) this.mc_music.s?.stop();
    else this.mc_music.s?.play();
    this.bMuteMusic = bool;
  }

  getMuteSound(): boolean { return this.bMuteSound; }
  getMuteMusic(): boolean { return this.bMuteMusic; }

  /** :51-69 — clamp 1..100 and rescale the playing music. */
  setVolumeMusic(value: number): void {
    const v = value > 100 ? 100 : value < 1 ? 1 : value;
    SharedObject.getLocal(this.COOKIE_NAME).data.volumeMusic = v;
    const s = this.mc_music.s;
    if (s) {
      s.volume = (v * s.volume) / this.volumeMusic;
      s.setVolume(s.volume);
    }
    this.volumeMusic = v;
  }

  /** :70-92 */
  setVolumeSound(value: number): void {
    const v = value > 100 ? 100 : value < 1 ? 1 : value;
    SharedObject.getLocal(this.COOKIE_NAME).data.volumeSound = v;
    for (const c of Object.values(this.mc_sound)) {
      const s = c instanceof MovieClip ? (c as SoundClip).s : undefined;
      if (!s) continue;
      s.volume = (v * s.volume) / this.volumeSound;
      s.setVolume(s.volume);
    }
    this.volumeSound = v;
  }

  getVolumeSound(): number { return this.volumeSound; }
  getVolumeMusic(): number { return this.volumeMusic; }

  /** :101-112 */
  init(): void {
    const so = SharedObject.getLocal(this.COOKIE_NAME).data;
    this.bMuteSound = !!so.muteSound;
    this.bMuteMusic = !!so.muteMusic;
    this.volumeMusic = so.volumeMusic == undefined ? 70 : Number(so.volumeMusic);
    this.volumeSound = so.volumeSound == undefined ? 70 : Number(so.volumeSound);
    this.createEmptyMovieClip("mc_sound", 1);
    this.createEmptyMovieClip("mc_music", 2);
    this.attachMovie("Dofus::Sound::ParamsManager", "paramsManager", 3);
  }

  /** :113-127 */
  getSoundVolume(file: string, soundOrMusic: "Sound" | "Music"): number {
    const p = this.paramsManager.getParams(file);
    return (this[`volume${soundOrMusic}`] * (p != undefined ? p.volume : 100)) / 100;
  }

  /**
   * :128-162. Port deviation: the previous music Sound is stopped. The AS only replaces `mc_music.s`; whether
   * Flash 6 kept the old Sound of the same clip playing is UNKNOWN — not in code (browser Audio would overlap).
   * `MUSIC_PATH` is read from `_global` (set by Kernel.Init to the served music folder).
   */
  playMusic(file: string, volume?: number, boucle?: number): GameSound | undefined {
    if (this.bMuteMusic != false || this.mc_music.s?.file == file) return undefined;
    const s = new GameSound(this.mc_music);
    this.mc_music.s?.stop();
    this.mc_music.s = s;
    s.file = file;
    s.volume = volume ?? this.getSoundVolume(file, "Music");
    s.boucle = boucle;
    s.onLoad = () => s.play(); // :151-154 — success is not checked
    s.onSoundComplete = () => s.onFinish?.();
    s.loadSound(G.MUSIC_PATH + file);
    return s;
  }

  /** :163-196 — one clip per sound under mc_sound, removed when the sound completes. */
  playSound(file: string, volume?: number, boucle?: number): GameSound | undefined {
    if (this.bMuteSound != false) return undefined;
    const vol = volume ?? this.getSoundVolume(file, "Sound");
    const id = this.getSoundID();
    const mc = this.mc_sound.createEmptyMovieClip("mc_sound" + id, id) as SoundClip;
    const s = new GameSound(mc);
    mc.s = s;
    s.volume = vol;
    s.boucle = boucle;
    s.mc = mc;
    s.onSoundComplete = () => {
      s.onFinish?.();
      s.mc?.removeMovieClip();
    };
    s.attachSound(file);
    s.play();
    return s;
  }

  /** :197-200 */
  stopMusic(): void {
    this.setMuteMusic(true);
  }

  /** :201-205 */
  stopSound(s: GameSound): void {
    s.stop();
    s.onSoundComplete?.();
  }

  // ---- Dofus.Sound.Event.as:3-49 ----
  onGameStart(): void {
    const s = this.playSound("start_fight", undefined, 2);
    if (s) s.onFinish = () => G.SOMA?.playMusic(G.MUSIC_FIGHT[Math.floor(Math.random() * G.MUSIC_FIGHT.length)]!, undefined, G.BOUCLE_INFINIE);
  }
  onGameEnd(): void {}
  onGameInvitation(): void { this.playSound("bip"); }
  onGameCriticalHit(): void { this.playSound("bip"); }
  onGameCriticalMiss(): void { this.playSound("coup_critique"); }
  onGetCharacters(): void { this.playMusic("02.mp3", undefined, G.BOUCLE_INFINIE); }
  onEnterMulti(): void { this.playMusic("07.mp3", undefined, G.BOUCLE_INFINIE); }
  onChatWisper(): void { this.playSound("bip"); }
  onError(): void { this.playSound("error"); }
  onTotProut(): void { this.playSound("pet"); }
  onEnterVillage(): void { this.playMusic("04.mp3", undefined, G.BOUCLE_INFINIE); }
}
registerClass("Dofus::Sound::Manager", SoundManager);

/** Dofus.Sound.Params.as:1-53 (`with (SOMA.paramsManager) addParams(...)`). */
const PARAMS: [string, number][] = [
  ["crockette_201", 65], ["crockette_202", 40], ["dodge_601", 65], ["dodge_602", 100], ["dodge_603", 100],
  ["grina_701", 35], ["grina_702", 67], ["grina_703", 55], ["grina_704", 85], ["grina_705", 91], ["grina_706", 65],
  ["grina_707", 65], ["jet_903", 42], ["jet_904", 65], ["many_501", 85], ["many_502", 40], ["many_503", 100],
  ["many_504", 100], ["many_505", 65], ["vlad_801", 65], ["vlad_802", 60], ["vlad_804", 45], ["vlad_806", 40],
  ["vlad_807", 50], ["setag_301", 75], ["setag_303", 60], ["setag_305", 85], ["coup_critique", 35], ["start_fight", 100],
  ["cc_arty", 95], ["cc_dodge", 50], ["cc_grina", 75], ["cc_grina2", 75], ["cc_jet", 100], ["cc_many", 64],
  ["cc_setag", 40], ["cc_vlad", 45], ["death", 75], ["hit_defaut", 70], ["hit_dodge", 35], ["pas_homme_normal", 100],
  ["pas_homme_petit", 90], ["pet", 43], ["02.mp3", 32], ["07.mp3", 22], ["04.mp3", 27], ["08.mp3", 29], ["10.mp3", 25],
  ["11.mp3", 30], ["12.mp3", 30],
];

/** Sound.swf's init actions (`this` = `_root.SoundManager`, the clip it was loaded into). */
export function soundSwfInit(this: MovieClip): void {
  G.SOMA = this.attachMovie("Dofus::Sound::Manager", "sm", 1) as SoundManager; // Manager.as:206
  for (const [file, volume] of PARAMS) G.SOMA.paramsManager.addParams(file, volume);
  G.BOUCLE_INFINIE = 9999; // Event.as:1
  G.MUSIC_FIGHT = ["10.mp3", "11.mp3", "12.mp3", "08.mp3"]; // Event.as:2
}
