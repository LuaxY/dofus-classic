Class_TabStart_Podium = function()
{
   var _loc1_ = this;
   _loc1_.init();
   _loc1_.XPLACES = [195,65,325];
   _loc1_.YPLACES = [-43,-38,-34];
};
Class_TabStart_Podium.prototype = new MovieClip();
Object.registerClass("TabStart_Podium",Class_TabStart_Podium);
Class_TabStart_Podium.prototype.init = function()
{
   this.createEmptyMovieClip("clips",10);
};
Class_TabStart_Podium.prototype.buildCharacter = function(place, data)
{
   var _loc1_ = this;
   _loc1_.clips.createEmptyMovieClip("sprite" + place,10 * Number(place));
   var _loc2_ = _loc1_.clips["sprite" + place];
   _loc2_._x = _loc1_.XPLACES[place];
   _loc2_._y = _loc1_.YPLACES[place];
   _loc2_.onInitFrame = function()
   {
      var _loc1_ = this;
      _loc1_.gotoAndStop("Podium");
      _loc1_._xscale = _loc1_._yscale = 180 - place * 20;
      CCOLORS.addCharacter(_loc1_);
      CCOLORS.setColor(_loc1_._target,data.color1,data.color2,data.color3);
   };
   _loc2_.loadMovie(data.file);
   _loc1_["txtCharacName" + place].setText(data.name,"Font2");
   _loc1_["txtCharacXP" + place].setText(getText("XP") + " : " + data.xp + " - " + getText("LEVEL_SMALL") + " " + data.level,"Font1");
};
Class_TabStart_Podium.prototype.clear = function()
{
   var _loc2_ = this;
   _loc2_.init();
   var _loc1_ = 0;
   while(_loc1_ < 3)
   {
      _loc2_["txtCharacName" + _loc1_].text = "";
      _loc2_["txtCharacXP" + _loc1_].text = "";
      _loc1_ = _loc1_ + 1;
   }
};
