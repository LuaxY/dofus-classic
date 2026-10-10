String.prototype.getAddLeftChar = function(char, size)
{
   var _loc3_ = size - this.length;
   var _loc2_ = "";
   var _loc1_ = 0;
   while(_loc1_ < _loc3_)
   {
      _loc2_ += char;
      _loc1_ = _loc1_ + 1;
   }
   _loc2_ += this;
   return _loc2_;
};
ASSetPropFlags(String.prototype,"getAddLeftChar",1);
