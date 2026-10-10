MovieClip.prototype.addProperty("onInitFrame",function()
{
}
,function(func)
{
   var _loc1_ = this;
   if(_level0._onInitFrameClips_ == undefined)
   {
      MovieClip.prototype._onInitFrameLastClipId_ = 1;
      MovieClip.prototype._onInitFrame_EnterFrame_ = function()
      {
         var _loc1_ = this;
         var _loc3_ = _loc1_.onInitClip.getBytesLoaded();
         var _loc2_ = _loc1_.onInitClip.getBytesTotal();
         if(_loc3_ == _loc2_ && _loc2_ > 4)
         {
            _loc1_.onInitClip.data = _loc1_.data;
            _loc1_.onInitFunction.apply(_loc1_.onInitClip);
            delete _loc1_.onEnterFrame;
            _loc1_.removeMovieClip();
         }
      };
      _level0.createEmptyMovieClip("_onInitFrameClips_",10000000);
   }
   else
   {
      MovieClip.prototype._onInitFrameLastClipId_++;
   }
   var _loc2_ = _level0._onInitFrameClips_.createEmptyMovieClip("_onInitFrameClip_" + MovieClip.prototype._onInitFrameLastClipId_,MovieClip.prototype._onInitFrameLastClipId_);
   _loc2_.data = _loc1_.data;
   _loc2_.onInitFunction = func;
   _loc2_.onInitClip = _loc1_;
   _loc2_.onEnterFrame = MovieClip.prototype._onInitFrame_EnterFrame_;
}
);
ASSetPropFlags(MovieClip.prototype,null,1,1);
