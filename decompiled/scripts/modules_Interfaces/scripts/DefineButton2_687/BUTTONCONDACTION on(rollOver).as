on(rollOver){
   var p = this._parent._parent._parent;
   if(p.choiceCharacterEnabled)
   {
      if(p7._currentframe == 1)
      {
         p7.gotoAndPlay(2);
      }
      p.selectCharacter(7);
   }
}
