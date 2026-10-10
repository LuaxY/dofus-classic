// Port of the `_global` constants of Dofus.Kernel.Init.as (lines 4–59) and of
// __Packages/dofus/Constants.as (AS2 class `dofus.Constants`, a separate, older set: VERSION = 4).
// The client reads the `_global` ones everywhere except `Item.iconFile` (dofus.Constants.ITEMS_PATH).

const DEBUG = false as boolean;

export const DEBUG_MODE = DEBUG; // Init.as:4
export const VERSION = 5; // Init.as:5
export const SERVER_PORT = 5555; // Init.as:6
export const PATH = ""; // Init.as:7
export const MODULE_PATH = PATH + "modules/"; // Init.as:8
export const CLIPS_PATH = PATH + "clips/"; // Init.as:9
export const CLIPS_PERSOS_PATH = CLIPS_PATH + "sprites/"; // Init.as:10
export const SPELLS_PATH = CLIPS_PATH + "spells/"; // Init.as:11
export const GUILDS_PATH = CLIPS_PATH + "guilds/"; // Init.as:12
export const GUILDS_MINI_PATH = GUILDS_PATH + "artwork/mini/"; // Init.as:13
export const GUILDS_FACES_PATH = GUILDS_PATH + "artwork/faces/"; // Init.as:14
export const GUILDS_BIG_PATH = GUILDS_PATH + "artwork/big/"; // Init.as:15
export const GUILDS_DESCRIPTIONS_PATH = GUILDS_PATH + "descriptions/"; // Init.as:16
// Init.as:17-30 — DEBUG_MODE is false in the shipped client, so the production branch applies.
export const SERVER_NAME = DEBUG ? "kam" : "server01.dofus.com";
export const SITE_PATH = DEBUG ? "jouer.dofus.lan" : "jouer.dofus.com";
export const HTTP_LANG_PATH = "http://" + SITE_PATH + "/files/lang/langupdater.php";
export const HTTP_LOGIN_PATH = "http://" + SITE_PATH + "/files/login/";
export const HTTP_MAPS_PATH = "http://" + SITE_PATH + "/files/maps/"; // Init.as:31
export const HTTP_NEWS_FILE = "http://" + SITE_PATH + "/files/news/news.php"; // Init.as:32
export const HTTP_BUG_REPORT = "http://" + SITE_PATH + "/files/bugreport/index.php"; // Init.as:33
export const MUSIC_PATH = "music/"; // Init.as:34
export const LOGIN_INTERFACE_FILE = "DofusLoginInterface"; // Init.as:35
export const MENU_INTERFACE_FILE = "DofusMenu"; // Init.as:36
export const CLICK_MINIMUM_TIMER = 500; // Init.as:37
export const NEWS_DELAY = 10000; // Init.as:38
export const DEFAULT_GUILD = 1; // Init.as:39
export const SEQUENCER_TIMEOUT = 10000; // Init.as:40
export const MAX_DATA_LENGTH = 200; // Init.as:41
export const INFO_CHAT_COLOR = "66FF00"; // Init.as:42
export const MSG_CHAT_COLOR = "C6ECFF"; // Init.as:43
export const MSGCHUCHOTE_CHAT_COLOR = "FFFFFF"; // Init.as:44
export const ERROR_CHAT_COLOR = "FF9900"; // Init.as:45
export const CELL_OVER_COLOR = 4473924; // Init.as:46
export const CELL_PATH_COLOR = 16737792; // Init.as:47
export const CELL_PATH_OVER_COLOR = 16737792; // Init.as:48
export const CELL_PATH_USED_COLOR = 2385558; // Init.as:49
export const CELL_PATH_SELECT_COLOR = 2385558; // Init.as:50
export const CELL_SPELL_EFFECT_COLOR = 16737792; // Init.as:51
export const CELL_SPELL_RANGE_COLOR = 2385558; // Init.as:52
export const LIFE_POINT_COLOR = 16711680; // Init.as:53
export const ACTION_POINT_COLOR = 255; // Init.as:54
export const TEAMS_COLOR = [16711680, 255] as const; // Init.as:55
// Init.as:56 — index = guild (class) id, 0 unused.
export const GUILD_NAMES = [null, "Féca", "Osamodas", "Enutrof", "Sram", "Xélor", "Ecaflip", "Eniripsa", "Iop", "Crâ", "Sadida"] as const;
export const PLAYER_HEIGHT = [0, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5] as const; // Init.as:57
export const SPELL_BOOST_BONUS = [0, 5, 8, 13, 20] as const; // Init.as:58
export const SPELL_BOOST_COST = [100, 200, 300, 400] as const; // Init.as:59

/** __Packages/dofus/Constants.as — class `dofus.Constants` (static vars, lines 3–24). */
export const Constants = (() => {
  const MODULE_PATH = "modules/";
  const PATH = "";
  const CLIPS_PATH = PATH + "clips/";
  const SPELLS_PATH = CLIPS_PATH + "spells/";
  const GUILDS_PATH = CLIPS_PATH + "guilds/";
  return {
    DEBUG: true,
    VERSION: 4,
    SERVER_NAME: "dofus",
    SERVER_PORT: 5555,
    MODULE_PATH,
    SOUNDS_PATH: MODULE_PATH + "sounds.swf",
    PATH,
    CLIPS_PATH,
    CLIPS_PERSOS_PATH: CLIPS_PATH + "sprites/",
    SPELLS_PATH,
    SPELLS_ICONS_PATH: SPELLS_PATH + "icons/",
    ITEMS_PATH: CLIPS_PATH + "items/",
    GUILDS_PATH,
    GUILDS_MINI_PATH: GUILDS_PATH + "artwork/mini/",
    GUILDS_FACES_PATH: GUILDS_PATH + "artwork/faces/",
    GUILDS_BIG_PATH: GUILDS_PATH + "artwork/big/",
    GUILDS_SYMBOL_PATH: GUILDS_PATH + "artwork/symbols/",
    GUILDS_DESCRIPTIONS_PATH: GUILDS_PATH + "descriptions/",
    SMILEY_FILE: CLIPS_PATH + "smileys.swf",
    GUILD_NAMES,
    // Constants.as:23 — [null, [1..20], [21..40], …, [201..220]]: 11 spell lists (one more than GUILD_NAMES has guilds).
    GUILD_SPELLS: [null, ...Array.from({ length: 11 }, (_, g) => Array.from({ length: 20 }, (_, i) => g * 20 + i + 1))],
    SMILEY_DELAY: 3000,
  } as const;
})();
