Array.prototype.indexOf = function(value)
{
   var _loc2_ = this;
   var _loc3_ = value;
   var _loc1_ = _loc2_.length;
   while(_loc1_--)
   {
      if(_loc2_[_loc1_] == _loc3_)
      {
         return _loc1_;
      }
   }
   return null;
};
