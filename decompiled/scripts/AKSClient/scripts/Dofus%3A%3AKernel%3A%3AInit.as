_global.DOFUS = _root;
Stage.scaleMode = "noScale";
_quality = "HIGH";
_global.DEBUG_MODE = false;
_global.VERSION = 5;
_global.SERVER_PORT = 5555;
_global.PATH = "";
_global.MODULE_PATH = PATH + "modules/";
_global.CLIPS_PATH = PATH + "clips/";
_global.CLIPS_PERSOS_PATH = CLIPS_PATH + "sprites/";
_global.SPELLS_PATH = CLIPS_PATH + "spells/";
_global.GUILDS_PATH = CLIPS_PATH + "guilds/";
_global.GUILDS_MINI_PATH = GUILDS_PATH + "artwork/mini/";
_global.GUILDS_FACES_PATH = GUILDS_PATH + "artwork/faces/";
_global.GUILDS_BIG_PATH = GUILDS_PATH + "artwork/big/";
_global.GUILDS_DESCRIPTIONS_PATH = GUILDS_PATH + "descriptions/";
if(DEBUG_MODE)
{
   _global.SERVER_NAME = "kam";
   _global.SITE_PATH = "jouer.dofus.lan";
   _global.HTTP_LANG_PATH = "http://" + SITE_PATH + "/files/lang/langupdater.php";
   _global.HTTP_LOGIN_PATH = "http://" + SITE_PATH + "/files/login/";
}
else
{
   _global.SERVER_NAME = "server01.dofus.com";
   _global.SITE_PATH = "jouer.dofus.com";
   _global.HTTP_LANG_PATH = "http://" + SITE_PATH + "/files/lang/langupdater.php";
   _global.HTTP_LOGIN_PATH = "http://" + SITE_PATH + "/files/login/";
}
_global.HTTP_MAPS_PATH = "http://" + SITE_PATH + "/files/maps/";
_global.HTTP_NEWS_FILE = "http://" + SITE_PATH + "/files/news/news.php";
_global.HTTP_BUG_REPORT = "http://" + SITE_PATH + "/files/bugreport/index.php";
_global.MUSIC_PATH = "music/";
_global.LOGIN_INTERFACE_FILE = "DofusLoginInterface";
_global.MENU_INTERFACE_FILE = "DofusMenu";
_global.CLICK_MINIMUM_TIMER = 500;
_global.NEWS_DELAY = 10000;
_global.DEFAULT_GUILD = 1;
_global.SEQUENCER_TIMEOUT = 10000;
_global.MAX_DATA_LENGTH = 200;
_global.INFO_CHAT_COLOR = "66FF00";
_global.MSG_CHAT_COLOR = "C6ECFF";
_global.MSGCHUCHOTE_CHAT_COLOR = "FFFFFF";
_global.ERROR_CHAT_COLOR = "FF9900";
_global.CELL_OVER_COLOR = 4473924;
_global.CELL_PATH_COLOR = 16737792;
_global.CELL_PATH_OVER_COLOR = 16737792;
_global.CELL_PATH_USED_COLOR = 2385558;
_global.CELL_PATH_SELECT_COLOR = 2385558;
_global.CELL_SPELL_EFFECT_COLOR = 16737792;
_global.CELL_SPELL_RANGE_COLOR = 2385558;
_global.LIFE_POINT_COLOR = 16711680;
_global.ACTION_POINT_COLOR = 255;
_global.TEAMS_COLOR = [16711680,255];
_global.GUILD_NAMES = [null,"Féca","Osamodas","Enutrof","Sram","Xélor","Ecaflip","Eniripsa","Iop","Crâ","Sadida"];
_global.PLAYER_HEIGHT = [0,1.5,1.5,1.5,1.5,1.5,1.5,1.5,1.5,1.5,1.5];
_global.SPELL_BOOST_BONUS = [0,5,8,13,20];
_global.SPELL_BOOST_COST = [100,200,300,400];
_global.AKS = new Class_Client();
_global.DATACENTER = new Class_DataCenter();
_global.KERNEL = new Class_Kernel();
_global.CHAT = new Class_Chat();
this.attachMovie("Dofus::BattleField","bf",2);
_global.SHARED_OBJECT = SharedObject.getLocal("DofusSO");
_global.CCOLORS = new Class_CharactersColors();
_global.WEAPONS = new Class_CharactersWeapons();
_global.log = function(txt, red)
{
   var _loc1_ = txt;
   if(red == true)
   {
      trace(_loc1_);
   }
   else if(_loc1_.length < 800)
   {
      DOFUS.debug.log += _loc1_ + "\n";
   }
};
_global.getText = function(ref, params)
{
   var _loc2_ = params;
   if(_loc2_ == undefined)
   {
      _loc2_ = new Array();
   }
   var arrayPosition = new Array();
   var _loc3_ = new Array();
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.length)
   {
      arrayPosition.push("%" + (_loc1_ + 1));
      _loc3_.push(_loc2_[_loc1_]);
      _loc1_ = _loc1_ + 1;
   }
   return SHARED_OBJECT.data[ref].replace(arrayPosition,_loc3_);
};
_global.getSpellText = function(spellID)
{
   return SHARED_OBJECT.data.S[spellID];
};
_global.getCCText = function(guildID)
{
   var _loc1_ = SHARED_OBJECT.data.CC[guildID];
   if(_loc1_)
   {
      return _loc1_;
   }
   return "?";
};
_global.getMapText = function(mapID)
{
   var _loc1_ = SHARED_OBJECT.data.M[Number(mapID)];
   if(_loc1_)
   {
      return _loc1_;
   }
   return {n:"?",d:"?"};
};
_global.getGuildText = function(guildID)
{
   var _loc1_ = SHARED_OBJECT.data.G[Number(guildID)];
   if(_loc1_)
   {
      return _loc1_;
   }
   return {sn:"?",ln:"?",d:"?",cc:"?"};
};
_global.getItemTypeText = function(typeID)
{
   var _loc1_ = SHARED_OBJECT.data.I.t[Number(typeID)];
   if(_loc1_)
   {
      return _loc1_;
   }
   return {n:"?",t:"?",g:"?",s:"?"};
};
_global.getItemSuperTypeText = function(superTypeID)
{
   var _loc1_ = SHARED_OBJECT.data.I.st[Number(superTypeID)];
   if(_loc1_.length != 0)
   {
      return _loc1_;
   }
   return "?";
};
_global.getItemEffectText = function(effectID)
{
   var _loc1_ = SHARED_OBJECT.data.I.e[Number(effectID)];
   if(_loc1_)
   {
      return _loc1_;
   }
   return {n:"?",c:"?"};
};
