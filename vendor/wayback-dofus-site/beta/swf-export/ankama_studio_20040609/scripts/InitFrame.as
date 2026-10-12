MovieClip.prototype.addProperty("onInitFrame",function()
{
}
,function(func)
{
   if(_level0._onInitFrameClips_ == undefined)
   {
      MovieClip.prototype._onInitFrameLastClipId_ = 1;
      MovieClip.prototype._onInitFrame_EnterFrame_ = function()
      {
         var BL = this.onInitClip.getBytesLoaded();
         var BT = this.onInitClip.getBytesTotal();
         if(BL == BT && BT > 4)
         {
            this.onInitClip.data = this.data;
            this.onInitFunction.apply(this.onInitClip);
            delete this.onEnterFrame;
            this.removeMovieClip();
         }
      };
      _level0.createEmptyMovieClip("_onInitFrameClips_",10000000);
   }
   else
   {
      MovieClip.prototype._onInitFrameLastClipId_++;
   }
   var clip = _level0._onInitFrameClips_.createEmptyMovieClip("_onInitFrameClip_" + MovieClip.prototype._onInitFrameLastClipId_,MovieClip.prototype._onInitFrameLastClipId_);
   clip.data = this.data;
   clip.onInitFunction = func;
   clip.onInitClip = this;
   clip.onEnterFrame = MovieClip.prototype._onInitFrame_EnterFrame_;
}
);
ASSetPropFlags(MovieClip.prototype,null,1,1);
