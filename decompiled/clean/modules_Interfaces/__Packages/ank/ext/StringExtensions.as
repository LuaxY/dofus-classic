class ank.ext.StringExtensions extends String
{
   function StringExtensions()
   {
      super();
   }
   function replace(pFrom, pTo)
   {
      var _loc3_ = pFrom;
      if(arguments.length == 0)
      {
         return this;
      }
      if(arguments.length == 1)
      {
         if(!(_loc3_ instanceof Array))
         {
            return this.split(_loc3_).join("");
         }
         pTo = new Array(_loc3_.length);
      }
      if(!(_loc3_ instanceof Array))
      {
         return this.split(_loc3_).join(pTo);
      }
      var lLength = _loc3_.length;
      var _loc2_ = this;
      var _loc1_;
      if(pTo instanceof Array)
      {
         _loc1_ = 0;
         while(_loc1_ < lLength)
         {
            _loc2_ = _loc2_.split(_loc3_[_loc1_]).join(pTo[_loc1_]);
            _loc1_ = _loc1_ + 1;
         }
      }
      else
      {
         _loc1_ = 0;
         while(_loc1_ < lLength)
         {
            _loc2_ = _loc2_.split(_loc3_[_loc1_]).join(pTo);
            _loc1_ = _loc1_ + 1;
         }
      }
      return _loc2_;
   }
}
