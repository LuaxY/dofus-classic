on(release){
   if(this._parent.txtZone.text.length != 0)
   {
      AKS.Chat.send(this._parent.txtZone.text,this._parent.params.to);
      this._parent.owner.hide();
   }
   else
   {
      Selection.setFocus(this._parent.txtZone);
   }
}
