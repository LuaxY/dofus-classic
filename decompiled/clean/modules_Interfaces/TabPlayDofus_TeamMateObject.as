Class_TabPlayDofus_TeamMateObject = function()
{
};
Class_TabPlayDofus_TeamMateObject.prototype = new MovieClip();
Object.registerClass("TabPlayDofus_TeamMateObject",Class_TabPlayDofus_TeamMateObject);
Class_TabPlayDofus_TeamMateObject.prototype.clear = function()
{
   delete this.destX;
};
Class_TabPlayDofus_TeamMateObject.prototype.move = function(bRight)
{
   var _loc1_ = this;
   var dir = !bRight ? -1 : 1;
   var _loc2_ = 133 * dir;
   var i = 0;
   _loc1_.destX = _loc1_.destX == undefined ? _loc1_._x + _loc2_ : _loc1_.destX + _loc2_;
   _loc1_.onEnterFrame = function()
   {
      var _loc1_ = this;
      i++;
      _loc1_._x += i * i * dir;
      if(_loc1_._x * dir > _loc1_.destX * dir)
      {
         _loc1_._x = _loc1_.destX;
         delete _loc1_.onEnterFrame;
      }
   };
};
