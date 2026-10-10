on(release){
   var destX = -333;
   this.spellGrid.onEnterFrame = function()
   {
      var _loc1_ = this;
      _loc1_._x -= 10;
      if(_loc1_._x < destX)
      {
         _loc1_._x = destX;
         delete _loc1_.onEnterFrame;
      }
   };
}
