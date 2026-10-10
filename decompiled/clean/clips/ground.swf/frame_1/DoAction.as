this.clear = function()
{
   this.createEmptyMovieClip("clips",1);
};
this.attach = function(symbol, name, depth)
{
   this.clips.createEmptyMovieClip(name,depth);
   var _loc1_ = this.clips[name];
   _loc1_.attachMovie(symbol,"clip",20);
   return _loc1_;
};
this.clear();
