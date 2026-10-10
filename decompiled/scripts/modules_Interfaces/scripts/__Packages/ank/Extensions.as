class ank.Extensions
{
   static var bExtended = false;
   function Extensions()
   {
   }
   static function addExtensions()
   {
      if(ank.Extensions.bExtended == true)
      {
         return true;
      }
      var mce = ank.ext.MovieClipExtensions.prototype;
      var _loc1_ = MovieClip.prototype;
      _loc1_.attachClassMovie = mce.attachClassMovie;
      var _loc3_ = ank.ext.StringExtensions.prototype;
      var _loc2_ = String.prototype;
      _loc2_.replace = _loc3_.replace;
   }
}
