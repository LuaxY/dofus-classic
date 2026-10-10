onClipEvent(load){
   c = 0;
   while(c < 5)
   {
      this.attachMovie("pierres","pierres" + c,c);
      c++;
   }
}
