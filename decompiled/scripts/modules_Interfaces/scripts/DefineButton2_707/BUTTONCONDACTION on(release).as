on(release){
   if(personnages._currentframe == 6 or personnages._currentframe == 12)
   {
      this.choiceCharacterEnabled = true;
      cercle.btcercle.gotoAndPlay(cercle.btcercle._currentframe + 1);
      personnages.gotoAndPlay(personnages._currentframe + 1);
   }
}
