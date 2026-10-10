on(rollOver){
   var p = this._parent._parent._parent;
   if(p.choiceCharacterEnabled)
   {
      if(p5._currentframe == 1)
      {
         p5.gotoAndPlay(2);
      }
      p.selectCharacter(5);
   }
}
