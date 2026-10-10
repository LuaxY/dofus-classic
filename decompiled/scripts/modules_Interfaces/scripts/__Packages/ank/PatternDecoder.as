class ank.PatternDecoder
{
   function PatternDecoder()
   {
   }
   static function getDescription(str, params)
   {
      ank.Extensions.addExtensions();
      var _loc1_ = str.split("");
      var _loc2_ = ank.PatternDecoder.decodeDescription(_loc1_,params).join("");
      return _loc2_;
   }
   static function combine(str, gender, singular)
   {
      ank.Extensions.addExtensions();
      var _loc2_ = str.split("");
      var _loc1_ = new Object();
      _loc1_.m = gender == "m";
      _loc1_.f = gender == "f";
      _loc1_.n = gender == "n";
      _loc1_.p = !singular;
      _loc1_.s = singular;
      var _loc3_ = ank.PatternDecoder.decodeCombine(_loc2_,_loc1_).join("");
      return _loc3_;
   }
   static function decodeDescription(splitStr, params)
   {
      var _loc2_ = splitStr;
      var _loc1_ = 0;
      var char = new String();
      var len = _loc2_.length;
      var _loc3_;
      while(_loc1_ < len)
      {
         char = _loc2_[_loc1_];
         switch(char)
         {
            case "#":
               var n = _loc2_[_loc1_ + 1];
               if(!isNaN(n))
               {
                  if(params[n - 1] != undefined)
                  {
                     _loc2_.splice(_loc1_,2,params[n - 1]);
                     _loc1_ = _loc1_ - 1;
                  }
                  else
                  {
                     _loc2_.splice(_loc1_,2);
                     _loc1_ -= 2;
                  }
               }
               break;
            case "~":
               var n = _loc2_[_loc1_ + 1];
               if(!isNaN(n))
               {
                  if(params[n - 1] == undefined)
                  {
                     return _loc2_.slice(0,_loc1_);
                  }
                  _loc2_.splice(_loc1_,2);
                  _loc1_ -= 2;
               }
               break;
            case "{":
               _loc3_ = ank.PatternDecoder.find(_loc2_.slice(_loc1_),"}");
               var rstr = ank.PatternDecoder.decodeDescription(_loc2_.slice(_loc1_ + 1,_loc1_ + _loc3_),params).join("");
               _loc2_.splice(_loc1_,_loc3_ + 1,rstr);
         }
         _loc1_ = _loc1_ + 1;
      }
      return _loc2_;
   }
   static function decodeCombine(splitStr, params)
   {
      var _loc2_ = splitStr;
      var _loc1_ = 0;
      var char = new String();
      var len = _loc2_.length;
      var _loc3_;
      while(_loc1_ < len)
      {
         char = _loc2_[_loc1_];
         switch(char)
         {
            case "~":
               var key = _loc2_[_loc1_ + 1];
               if(!params[key])
               {
                  return _loc2_.slice(0,_loc1_);
               }
               _loc2_.splice(_loc1_,2);
               _loc1_ -= 2;
               break;
            case "{":
               _loc3_ = ank.PatternDecoder.find(_loc2_.slice(_loc1_),"}");
               var rstr = ank.PatternDecoder.decodeCombine(_loc2_.slice(_loc1_ + 1,_loc1_ + _loc3_),params).join("");
               _loc2_.splice(_loc1_,_loc3_ + 1,rstr);
         }
         _loc1_ = _loc1_ + 1;
      }
      return _loc2_;
   }
   static function find(a, f)
   {
      var _loc3_ = a;
      var _loc2_ = _loc3_.length;
      var _loc1_;
      _loc1_ = 0;
      while(_loc1_ < _loc2_)
      {
         if(_loc3_[_loc1_] == f)
         {
            return _loc1_;
         }
         _loc1_ = _loc1_ + 1;
      }
      return -1;
   }
}
