class ank.ext.MovieClipExtensions extends MovieClip
{
   function MovieClipExtensions()
   {
      super();
   }
   function attachClassMovie(className, instanceName, depth)
   {
      var _loc1_ = this.createEmptyMovieClip(instanceName,depth);
      _loc1_.__proto__ = className.prototype;
      className.apply(_loc1_);
      return _loc1_;
   }
}
