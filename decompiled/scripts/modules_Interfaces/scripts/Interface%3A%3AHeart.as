Class_InterfaceBannerHeart = function()
{
};
Class_InterfaceBannerHeart.prototype = new MovieClip();
Object.registerClass("Interface::Heart",Class_InterfaceBannerHeart);
Class_InterfaceBannerHeart.prototype.setLifePoints = function(lp, max)
{
   this.txtLifePoint.text = lp;
   var _loc1_ = Number(lp) / Number(max) * 100;
   trace("##########" + max);
   this.levelMeter._yscale = _loc1_;
};
