onClipEvent(load){
   c = 100;
   while(c < 120)
   {
      this.attachMovie("pierres","pierres" + c,c);
      c++;
   }
}
