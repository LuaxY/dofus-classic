on(release){
   if(this._parent.selectedcharacterData.name.indexOf("_emag") != -1)
   {
      INTERFACE.msgBox("Ce personnage ne peut être supprimé.");
      return undefined;
   }
   if(this._parent.selectedcharacterID == undefined)
   {
      INTERFACE.msgBox(getText("SELECT_CHARACTER"));
   }
   else
   {
      AKS.Account.deleteCharacter(this._parent.selectedcharacterID);
   }
}
