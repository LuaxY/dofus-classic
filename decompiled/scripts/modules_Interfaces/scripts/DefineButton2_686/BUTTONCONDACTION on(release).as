on(release){
   var p = this._parent._parent._parent;
   p.choiceCharacterEnabled = false;
   p.cercle.btcercle.gotoAndPlay(p.cercle.btcercle._currentframe + 1);
   p.personnages.gotoAndPlay(p.personnages._currentframe + 1);
}
