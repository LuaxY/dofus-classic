onClipEvent(load){
   c = 100;
   while(c < 130)
   {
      this.attachMovie("pierres","pierres" + c,c);
      c++;
   }
}
