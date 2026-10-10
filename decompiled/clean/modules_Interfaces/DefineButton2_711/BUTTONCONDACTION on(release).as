on(release){
   var bOk = true;
   if(this.txtNomPerso.text.length == 0)
   {
      INTERFACE.msgBox(getText("NEED_CHARACTER_NAME",[]));
      bOk = false;
   }
   if(this.txtNomPerso.text.length > 20)
   {
      INTERFACE.msgBox(getText("LONG_CHARACTER_NAME",[this.txtNomPerso.text,20]));
      bOk = false;
   }
   switch(this.mGuild)
   {
      case 1:
      case 4:
      case 10:
         INTERFACE.msgBox("Cette guilde n\'est pas encore disponible.");
         return undefined;
      default:
         if(bOk)
         {
            AKS.Account.addCharacter(this.nomPerso,this.mGuild,this.mColor1,this.mColor2,this.mColor3);
         }
   }
}
