Class_TeamWatcherCharacter = function()
{
   this.init();
};
Class_TeamWatcherCharacter.prototype = new MovieClip();
Object.registerClass("Interface::TeamWatcherCharacter",Class_TeamWatcherCharacter);
Class_TeamWatcherCharacter.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.createEmptyMovieClip("clip",10);
   _loc1_.onInitFrame = function()
   {
      this.gotoAndStop("staticR");
   };
   _loc1_.clip.loadMovie(_loc1_.data.file);
   _loc1_.clip._x = _loc1_.width / 2;
   _loc1_.clip._y = _loc1_.height / 2 + 10;
   if(_loc1_.team == 1)
   {
      _loc1_.clip._xscale *= -1;
   }
   CCOLORS.addCharacter(_loc1_.clip);
   CCOLORS.setColor(_loc1_.clip._target,_loc1_.data.color1,_loc1_.data.color2,_loc1_.data.color3);
   WEAPONS.addCharacter(_loc1_.clip);
   WEAPONS.setData(_loc1_.clip._target,_loc1_.data);
   _loc1_.name_txt.setText(_loc1_.data.name,"Font2");
   _loc1_.level_txt.setText(getText("LEVEL") + " " + _loc1_.data.level,"Font1");
};
