stop();
this.ensemble.decor.loadMovie("swf/decor.swf");
this.ensemble.perso1.loadMovie("swf/perso/" + _root.choix1 + ".swf");
this.ensemble.perso2.loadMovie("swf/perso/" + _root.choix2 + ".swf");
this.onEnterFrame = function()
{
   var _loc1_ = this;
   var tBt = _loc1_.getBytesTotal();
   var tBl = _loc1_.getBytesLoaded();
   var p1Bt = _loc1_.ensemble.perso1.getBytesTotal();
   var p2Bt = _loc1_.ensemble.perso2.getBytesTotal();
   var _loc3_ = _loc1_.ensemble.decor.getBytesTotal();
   var _loc2_ = p1Bt + p2Bt + _loc3_;
   var eBl = _loc1_.ensemble.perso1.getBytesLoaded() + _loc1_.ensemble.perso2.getBytesLoaded() + _loc1_.ensemble.decor.getBytesLoaded();
   lod.barlod._xscale = 100 * (tBl + eBl) / (tBt + _loc2_);
   if(_loc2_ == eBl && _loc2_ != undefined && p1Bt > 50 && p2Bt > 50 && _loc3_ > 50)
   {
      gotoAndStop(3);
      delete _loc1_.onEnterFrame;
   }
};
