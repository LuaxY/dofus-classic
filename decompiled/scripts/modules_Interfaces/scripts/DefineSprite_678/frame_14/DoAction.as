stop();
palette1.onSelectRelease = function(color)
{
   var _loc1_ = this._parent._parent._parent._parent._parent;
   _loc1_.mColor1 = color;
   CCOLORS.setColor(_loc1_.personnages.couleur.perso._target,color,-1,-1);
   _loc1_.personnages.couleur.perso.gotoAndStop("Init");
};
