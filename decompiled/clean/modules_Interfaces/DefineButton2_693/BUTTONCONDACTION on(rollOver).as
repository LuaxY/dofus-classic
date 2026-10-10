on(rollOver){
   var p = this._parent._parent._parent;
   if(p.choiceCharacterEnabled)
   {
      if(p1._currentframe == 1)
      {
         p1.gotoAndPlay(2);
      }
      p.selectCharacter(1);
   }
}
