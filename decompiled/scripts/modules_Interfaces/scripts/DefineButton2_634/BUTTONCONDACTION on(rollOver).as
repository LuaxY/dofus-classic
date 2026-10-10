on(rollOver){
   if(this.perso._currentframe == 2)
   {
      this.perso.playAllClip();
      this.perso.gotoAndStop("waitR");
   }
   else
   {
      this.perso.gotoAndPlay("init");
   }
}
