on(rollOver){
   var p = this._parent._parent._parent;
   if(p.choiceCharacterEnabled)
   {
      if(p8._currentframe == 1)
      {
         p8.gotoAndPlay(2);
      }
      p.selectCharacter(8);
   }
}
