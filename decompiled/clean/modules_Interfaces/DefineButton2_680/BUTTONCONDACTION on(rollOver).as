on(rollOver){
   var p = this._parent._parent._parent;
   if(p.choiceCharacterEnabled)
   {
      if(p10._currentframe == 1)
      {
         p10.gotoAndPlay(2);
      }
      p.selectCharacter(10);
   }
}
