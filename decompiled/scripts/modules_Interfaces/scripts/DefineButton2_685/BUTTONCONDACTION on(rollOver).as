on(rollOver){
   var p = this._parent._parent._parent;
   if(p.choiceCharacterEnabled)
   {
      if(p9._currentframe == 1)
      {
         p9.gotoAndPlay(2);
      }
      p.selectCharacter(9);
   }
}
