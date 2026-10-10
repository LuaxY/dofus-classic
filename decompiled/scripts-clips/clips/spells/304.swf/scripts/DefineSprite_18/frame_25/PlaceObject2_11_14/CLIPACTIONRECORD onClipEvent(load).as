onClipEvent(load){
   c = 100;
   while(c < 115)
   {
      this.attachMovie("pierres","pierres" + c,c);
      c++;
   }
   b = 200;
   while(b < 220)
   {
      this.attachMovie("or","or" + b,b);
      b++;
   }
}
