on(release){
   if(this._parent.selectedcharacterID == undefined)
   {
      INTERFACE.msgBox(getText("SELECT_CHARACTER",[]));
   }
   else
   {
      AKS.Account.setCharacter(this._parent.selectedcharacterID);
   }
}
