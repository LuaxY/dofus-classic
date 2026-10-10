Object.prototype.copyValues = function(objInit)
{
   var _loc1_ = objInit;
   var _loc3_ = this;
   for(var _loc2_ in _loc1_)
   {
      _loc3_[_loc2_] = _loc1_[_loc2_];
   }
};
ASSetPropFlags(Object.prototype,"copyValues",1,1);
