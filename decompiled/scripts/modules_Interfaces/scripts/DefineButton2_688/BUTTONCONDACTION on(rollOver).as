on(rollOver){
   var p = this._parent._parent._parent;
   if(p.choiceCharacterEnabled)
   {
      if(p6._currentframe == 1)
      {
         p6.gotoAndPlay(2);
      }
      p.selectCharacter(6);
   }
}
