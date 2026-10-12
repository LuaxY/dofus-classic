stop();
if(choix1 == undefined)
{
   choix1 = 1 + Math.floor(19 * Math.random());
}
if(choix2 == undefined)
{
   choix2 = 1 + Math.floor(19 * Math.random());
}
while(choix2 == choix1)
{
   choix2 = 1 + Math.floor(19 * Math.random());
}
trace(this.getBytesTotal());
this.onEnterFrame = function()
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.getBytesTotal();
   var _loc3_ = _loc1_.getBytesLoaded();
   var eBt = _loc1_.ensemble.perso1.getBytesTotal() + _loc1_.ensemble.perso2.getBytesTotal() + _loc1_.ensemble.decor.getBytesTotal();
   var eBl = _loc1_.ensemble.perso1.getBytesLoaded() + _loc1_.ensemble.perso2.getBytesLoaded() + _loc1_.ensemble.decor.getBytesLoaded();
   lod.barlod._xscale = 100 * _loc3_ / _loc2_;
   trace("this > " + _loc3_ + " " + _loc2_);
   if(_loc2_ == _loc3_ && _loc2_ != undefined && _loc2_ > 40)
   {
      gotoAndStop(2);
   }
};
