MovieClip.prototype.playAllClip = function()
{
   var _loc1_ = this;
   _loc1_.play();
   for(var _loc2_ in _loc1_)
   {
      if(_loc1_[_loc2_].__proto__ == MovieClip.prototype)
      {
         _loc1_[_loc2_].playAllClip();
      }
   }
};
