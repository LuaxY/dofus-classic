MovieClip.prototype.setAllCurrentFrames = function(obj, stop)
{
   var _loc1_ = obj;
   var _loc2_ = this;
   var _loc3_ = stop;
   if(_loc3_)
   {
      _loc2_.gotoAndStop(_loc1_.frame);
   }
   else
   {
      _loc2_.gotoAndPlay(_loc1_.frame);
   }
   for(var a in _loc1_.childs)
   {
      _loc2_[a].setAllCurrentFrames(_loc1_.childs[a],_loc3_);
   }
};
