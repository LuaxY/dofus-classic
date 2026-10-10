stop();
palette2.onSelectRelease = function(color)
{
   var _loc1_ = this._parent._parent._parent._parent._parent;
   _loc1_.mColor2 = color;
   CCOLORS.setColor(_loc1_.personnages.couleur.perso._target,-1,color,-1);
   _loc1_.personnages.couleur.perso.gotoAndStop("Init");
};
