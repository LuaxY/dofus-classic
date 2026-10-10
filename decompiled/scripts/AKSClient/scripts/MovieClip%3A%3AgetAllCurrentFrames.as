MovieClip.prototype.getAllCurrentFrames = function()
{
   var _loc1_ = this;
   var _loc2_ = new Object();
   _loc2_.frame = _loc1_._currentframe;
   _loc2_.childs = new Object();
   for(var _loc3_ in _loc1_)
   {
      if(_loc1_[_loc3_].__proto__ == MovieClip.prototype)
      {
         _loc2_.childs[_loc3_] = _loc1_[_loc3_].getAllCurrentFrames();
      }
   }
   return _loc2_;
};
