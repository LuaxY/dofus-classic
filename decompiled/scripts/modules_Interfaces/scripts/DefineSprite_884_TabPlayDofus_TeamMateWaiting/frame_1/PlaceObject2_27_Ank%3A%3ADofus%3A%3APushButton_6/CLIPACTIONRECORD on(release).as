on(release){
   var p = this._parent;
   AKS.Game.invitationUndo(p.id);
   p._parent._parent.onRemoveCharacter(p.id);
}
