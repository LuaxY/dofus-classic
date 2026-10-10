onClipEvent(enterFrame){
   _Y = _Y + v;
   v += 2;
   if(_Y >= 0)
   {
      v = -3 * Math.random();
   }
}
