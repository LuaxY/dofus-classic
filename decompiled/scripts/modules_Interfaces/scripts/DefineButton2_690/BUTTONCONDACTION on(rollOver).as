on(rollOver){
   var p = this._parent._parent._parent;
   if(p.choiceCharacterEnabled)
   {
      if(p4._currentframe == 1)
      {
         p4.gotoAndPlay(2);
      }
      p.selectCharacter(4);
   }
}
