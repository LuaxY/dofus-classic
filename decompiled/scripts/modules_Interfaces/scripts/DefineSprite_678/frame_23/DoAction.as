stop();
palette3.onSelectRelease = function(color)
{
   var _loc1_ = this._parent._parent._parent._parent._parent;
   _loc1_.mColor3 = color;
   CCOLORS.setColor(_loc1_.personnages.couleur.perso._target,-1,-1,color);
   _loc1_.personnages.couleur.perso.gotoAndStop("Init");
};
