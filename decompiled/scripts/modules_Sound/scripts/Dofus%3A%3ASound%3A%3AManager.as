Class_Sound_Manager = function()
{
   this.COOKIE_NAME = "DofusSO";
   this.init();
};
var proto = Class_Sound_Manager.prototype = new MovieClip();
Object.registerClass("Dofus::Sound::Manager",Class_Sound_Manager);
proto.getSoundID = function()
{
   return this.current_sound_id++;
};
proto.setMuteSound = function(bool)
{
   var _loc2_ = this;
   var soundCookies = SharedObject.getLocal(_loc2_.COOKIE_NAME);
   soundCookies.data.muteSound = bool;
   var _loc1_ = _loc2_.mc_sound;
   if(bool == true)
   {
      for(var _loc3_ in _loc1_)
      {
         _loc2_.stopSound(_loc1_[_loc3_].s);
      }
   }
   _loc2_.bMuteSound = bool;
};
proto.setMuteMusic = function(bool)
{
   var _loc1_ = this;
   var _loc2_ = bool;
   var _loc3_ = SharedObject.getLocal(_loc1_.COOKIE_NAME);
   _loc3_.data.muteMusic = _loc2_;
   if(_loc2_ == true)
   {
      _loc1_.mc_music.s.stop();
   }
   else
   {
      _loc1_.mc_music.s.play();
   }
   _loc1_.bMuteMusic = _loc2_;
};
proto.getMuteSound = function()
{
   return this.bMuteSound;
};
proto.getMuteMusic = function()
{
   return this.bMuteMusic;
};
proto.setVolumeMusic = function(value)
{
   var _loc1_ = value;
   var _loc3_ = this;
   if(_loc1_ > 100)
   {
      _loc1_ = 100;
   }
   else if(_loc1_ < 1)
   {
      _loc1_ = 1;
   }
   var soundCookies = SharedObject.getLocal(_loc3_.COOKIE_NAME);
   soundCookies.data.volumeMusic = _loc1_;
   var _loc2_ = _loc3_.mc_music.s;
   _loc2_.volume = _loc1_ * _loc2_.volume / _loc3_.volumeMusic;
   _loc2_.setVolume(_loc2_.volume);
   _loc3_.volumeMusic = _loc1_;
};
proto.setVolumeSound = function(value)
{
   var _loc3_ = value;
   if(_loc3_ > 100)
   {
      _loc3_ = 100;
   }
   else if(_loc3_ < 1)
   {
      _loc3_ = 1;
   }
   var soundCookies = SharedObject.getLocal(this.COOKIE_NAME);
   soundCookies.data.volumeSound = _loc3_;
   var _loc2_ = this.mc_sound;
   var _loc1_;
   for(var a in _loc2_)
   {
      _loc1_ = _loc2_[a].s;
      _loc1_.volume = _loc3_ * _loc1_.volume / this.volumeSound;
      _loc1_.setVolume(_loc1_.volume);
   }
   this.volumeSound = _loc3_;
};
proto.getVolumeSound = function()
{
   return this.volumeSound;
};
proto.getVolumeMusic = function()
{
   return this.volumeMusic;
};
proto.init = function()
{
   var _loc1_ = this;
   var _loc2_ = SharedObject.getLocal(_loc1_.COOKIE_NAME);
   _loc1_.bMuteSound = !_loc2_.data.muteSound ? false : true;
   _loc1_.bMuteMusic = !_loc2_.data.muteMusic ? false : true;
   _loc1_.volumeMusic = _loc2_.data.volumeMusic == undefined ? 70 : _loc2_.data.volumeMusic;
   _loc1_.volumeSound = _loc2_.data.volumeSound == undefined ? 70 : _loc2_.data.volumeSound;
   _loc1_.createEmptyMovieClip("mc_sound",1);
   _loc1_.createEmptyMovieClip("mc_music",2);
   _loc1_.attachMovie("Dofus::Sound::ParamsManager","paramsManager",3);
};
proto.getSoundVolume = function(file, soundOrMusic)
{
   var _loc1_ = this.paramsManager.getParams(file);
   var _loc3_;
   if(_loc1_ != undefined)
   {
      _loc3_ = _loc1_.volume;
   }
   else
   {
      _loc3_ = 100;
   }
   var _loc2_ = this["volume" + soundOrMusic];
   return _loc2_ * _loc3_ / 100;
};
proto.playMusic = function(file, volume, boucle)
{
   var _loc2_ = this;
   var _loc3_ = file;
   var _loc1_;
   if(_loc2_.bMuteMusic == false && _loc2_.mc_music.s.file != _loc3_)
   {
      if(volume == undefined)
      {
         var volume = _loc2_.getSoundVolume(_loc3_,"Music");
      }
      var mc = _loc2_.mc_music;
      _loc1_ = new Sound(mc);
      mc.s = _loc1_;
      _loc1_.file = _loc3_;
      _loc1_.volume = volume;
      _loc1_.boucle = boucle;
      _loc1_.play = function()
      {
         var _loc1_ = this;
         _loc1_.start(0,_loc1_.boucle);
         _loc1_.setVolume(_loc1_.volume);
      };
      _loc1_.onLoad = function()
      {
         this.play();
      };
      _loc1_.onSoundComplete = function()
      {
         this.onFinish();
      };
      _loc1_.loadSound(MUSIC_PATH + _loc3_);
      return _loc1_;
   }
};
proto.playSound = function(file, volume, boucle)
{
   var _loc2_ = this;
   var _loc3_;
   var _loc1_;
   if(_loc2_.bMuteSound == false)
   {
      if(volume == undefined)
      {
         var volume = _loc2_.getSoundVolume(file,"Sound");
      }
      var id = _loc2_.getSoundID();
      _loc3_ = _loc2_.mc_sound.createEmptyMovieClip("mc_sound" + id,id);
      _loc1_ = new Sound(_loc3_);
      _loc3_.s = _loc1_;
      _loc1_.volume = volume;
      _loc1_.boucle = boucle;
      _loc1_.mc = _loc3_;
      _loc1_.play = function()
      {
         var _loc1_ = this;
         _loc1_.start(0,_loc1_.boucle);
         _loc1_.setVolume(_loc1_.volume);
      };
      _loc1_.onSoundComplete = function()
      {
         this.onFinish();
         this.mc.removeMovieClip();
      };
      _loc1_.attachSound(file);
      _loc1_.play();
      return _loc1_;
   }
};
proto.stopMusic = function()
{
   this.setMuteMusic(true);
};
proto.stopSound = function(s)
{
   s.stop();
   s.onSoundComplete();
};
_global.SOMA = this.attachMovie("Dofus::Sound::Manager","sm",1);
