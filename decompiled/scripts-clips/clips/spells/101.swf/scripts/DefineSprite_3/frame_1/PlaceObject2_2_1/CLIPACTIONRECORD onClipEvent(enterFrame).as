onClipEvent(enterFrame){
   _Y = _Y + v;
   _X = _X + vx;
   v += 2;
   if(_Y > 0)
   {
      _Y = 0;
      v = -7 * Math.random();
      vx = -5 * Math.random() + 2.5;
   }
}
