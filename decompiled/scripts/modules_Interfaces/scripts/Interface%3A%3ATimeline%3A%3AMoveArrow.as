Class_Timeline_MoveArrow = function()
{
};
Class_Timeline_MoveArrow.prototype = new MovieClip();
Object.registerClass("Interface::Timeline::MoveArrow",Class_Timeline_MoveArrow);
Class_Timeline_MoveArrow.prototype.clear = function()
{
   delete this.destX;
   this._x = 0;
};
Class_Timeline_MoveArrow.prototype.move = function(destX)
{
   var _loc1_ = this;
   var dir = destX <= _loc1_._x ? -1 : 1;
   var i = 0;
   _loc1_.destX = destX;
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
