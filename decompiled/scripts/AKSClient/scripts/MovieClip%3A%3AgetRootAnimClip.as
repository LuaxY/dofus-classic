MovieClip.prototype.getRootAnimClip = function()
{
   var _loc2_ = 20;
   var _loc1_ = this;
   while(_loc2_ >= 0)
   {
      if(_loc1_._ROOTANIM)
      {
         return _loc1_._ROOTANIM;
      }
      _loc1_ = _loc1_._parent;
      _loc2_ = _loc2_ - 1;
   }
};
