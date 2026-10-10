on(rollOver){
   var p = this._parent._parent._parent;
   if(p.choiceCharacterEnabled)
   {
      if(p3._currentframe == 1)
      {
         p3.gotoAndPlay(2);
      }
      p.selectCharacter(3);
   }
}
