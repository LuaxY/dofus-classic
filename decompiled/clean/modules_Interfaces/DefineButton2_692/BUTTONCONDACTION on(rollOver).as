on(rollOver){
   var p = this._parent._parent._parent;
   if(p.choiceCharacterEnabled)
   {
      if(p2._currentframe == 1)
      {
         p2.gotoAndPlay(2);
      }
      p.selectCharacter(2);
   }
}
