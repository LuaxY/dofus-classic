on(rollOver){
   if(DATACENTER.Game.isFight || INTERFACE.getSpellCursor() != undefined || INTERFACE.getCursor() != undefined)
   {
      var ccData = getGuildText(DATACENTER.Player.data.guild).cc;
      var txt = dofus.Translator.getText("CC_DAMAGES") + "\n" + dofus.Translator.getText("DAMAGES") + " : " + ank.PatternDecoder.getDescription("#1{~1D}#2{~2~3+}#3",ccData) + " (" + ccData[3] + dofus.Translator.getText("AP") + ")";
      INTERFACE.drawToolTip(txt,10,-10,true);
   }
}
