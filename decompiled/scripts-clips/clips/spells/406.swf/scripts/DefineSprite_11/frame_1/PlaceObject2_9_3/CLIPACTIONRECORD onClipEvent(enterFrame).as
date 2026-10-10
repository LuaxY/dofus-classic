onClipEvent(enterFrame){
   if(c < _parent._parent._parent.level * 3)
   {
      c += 1;
      this.attachMovie("pierres","pierres" + c,c);
      c += 1;
      this.attachMovie("pierres","pierres" + c,c);
   }
}
