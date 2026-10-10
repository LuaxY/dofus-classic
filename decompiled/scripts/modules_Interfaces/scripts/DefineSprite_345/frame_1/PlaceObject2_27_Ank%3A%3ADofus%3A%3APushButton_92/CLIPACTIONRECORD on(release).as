on(release){
   var p = this._parent;
   var val = p.comboGames.getValue();
   var pos = val.indexOf(" (");
   if(pos == -1)
   {
      pos = val.length;
   }
   AKS.Game.tmpPassword = this._parent.txtGamePass.text;
   AKS.Game.join(AKS.Game.STATE_FREE,val.substring(0,pos),this._parent.txtGamePass1.text);
}
