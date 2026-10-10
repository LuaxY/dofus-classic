on(release){
   if(this._parent.txtGameName.text.length == 0)
   {
      return undefined;
   }
   var p = this._parent;
   AKS.Game.tmpPassword = this._parent.txtGamePass2.text;
   AKS.Game.createFree(p.txtGameName.text,2,p.comboMaps.getSelectedItem().data,p.comboNumberPlayer.getSelectedItem().data,this._parent.txtGamePass2.text);
}
