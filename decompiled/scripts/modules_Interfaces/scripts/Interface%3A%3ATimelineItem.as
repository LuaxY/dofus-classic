Class_Interface_TimelineItem = function()
{
   this.init();
};
Class_Interface_TimelineItem.prototype = new MovieClip();
Object.registerClass("Interface::TimelineItem",Class_Interface_TimelineItem);
Class_Interface_TimelineItem.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.createEmptyMovieClip("sprite",1);
   _loc1_.sprite.onInitFrame = function()
   {
      var _loc1_ = this;
      _loc1_.gotoAndStop("staticR");
      _loc1_.stopAllClip();
      _loc1_._y = 48;
      _loc1_._x = 15;
      _loc1_._xscale = -90;
      _loc1_._yscale = 90;
      _loc1_.setMask(_loc1_._parent.maskRect);
   };
   _loc1_.sprite.loadMovie(_loc1_.data.file);
   CCOLORS.addCharacter(_loc1_.sprite);
   CCOLORS.setColor(_loc1_.sprite._target,_loc1_.data.color1,_loc1_.data.color2,_loc1_.data.color3);
   _loc1_.attachMovie("MaskRect","maskRect",2);
   _loc1_.attachMovie("Interface::ChronoVerti","Chrono",10,{_x:2,_y:2});
};
Class_Interface_TimelineItem.prototype.onRollOver = function()
{
   this.backRect._alpha = 50;
   this.data.clip.sprite.onRollOver();
};
Class_Interface_TimelineItem.prototype.onRollOut = function()
{
   this.backRect._alpha = 100;
   this.data.clip.sprite.onRollOut();
};
