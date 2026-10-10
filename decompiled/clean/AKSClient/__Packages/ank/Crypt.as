class ank.Crypt
{
   static var HASH = new Array("a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","0","1","2","3","4","5","6","7","8","9","-","_");
   function Crypt()
   {
   }
   static function cryptPassword(pwd, key)
   {
      var _loc2_ = pwd.length;
      var _loc3_ = "";
      var _loc1_;
      if(_loc2_ % 8 != 0)
      {
         pwd += pwd.substr(0,8 - _loc2_ % 8);
      }
      _loc2_ = pwd.length;
      _loc1_ = 0;
      while(_loc1_ < _loc2_)
      {
         _loc3_ += ank.Crypt.HASH[(pwd.charCodeAt(_loc1_) ^ key.charCodeAt(_loc1_ % 32)) % 64];
         _loc1_ = _loc1_ + 1;
      }
      _loc2_ = _loc3_.length;
      pwd = _loc3_;
      _loc3_ = "";
      _loc1_ = 0;
      while(_loc1_ < _loc2_)
      {
         _loc3_ += ank.Crypt.HASH[(pwd.charCodeAt(_loc2_ - _loc1_ - 1) ^ key.charCodeAt((_loc1_ + 8) % 32)) % 64];
         _loc1_ = _loc1_ + 1;
      }
      return _loc3_;
   }
}
