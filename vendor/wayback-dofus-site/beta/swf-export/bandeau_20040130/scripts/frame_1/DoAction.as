stop();
this.decor.loadMovie("swf/decor.swf");
this.ensemble.loadMovie("swf/clipperso.swf");
this.onEnterFrame = function()
{
   var _loc3_ = this;
   var _loc1_ = _loc3_.ensemble.getBytesTotal() + _loc3_.decor.getBytesTotal();
   var _loc2_ = _loc3_.ensemble.getBytesLoaded() + _loc3_.decor.getBytesLoaded();
   lod.barlod._xscale = 100 * _loc2_ / _loc1_;
   _loc3_.txt.text = _loc2_ + "/" + _loc1_;
   trace(_loc1_ + " " + _loc2_);
   if(_loc1_ == _loc2_ && _loc1_ != undefined && _loc1_ > 30)
   {
      gotoAndStop(2);
      delete _loc3_.onEnterFrame;
   }
};
