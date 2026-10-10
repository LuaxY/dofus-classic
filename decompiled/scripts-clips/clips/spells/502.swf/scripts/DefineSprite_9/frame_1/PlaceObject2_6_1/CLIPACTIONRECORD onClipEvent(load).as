onClipEvent(load){
   c = 0;
   while(c < 20)
   {
      this.attachMovie("pierres","pierres" + c,c);
      c++;
   }
}
