onClipEvent(enterFrame){
   if(c < 20)
   {
      this.attachMovie("pierres","pierres" + c,c + 1);
      c++;
   }
}
