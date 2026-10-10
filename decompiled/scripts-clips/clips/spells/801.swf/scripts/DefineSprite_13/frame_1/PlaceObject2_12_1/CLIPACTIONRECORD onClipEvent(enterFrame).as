onClipEvent(enterFrame){
   if(_Y > -100 & _parent._alpha < 100)
   {
      _parent._alpha += 20;
   }
   if(_Y < -100)
   {
      _parent._alpha -= 20;
      if(_parent._alpha < 0)
      {
         _parent._visible = 0;
         stop = 1;
         _parent.removeMovieClip();
      }
   }
   _rotation = _rotation + 4;
   _Y = 5 * Math.cos(i) + (p -= v);
   _X = 25 * Math.sin(i += v2);
   if(Math.sin(i) > 0)
   {
      _alpha = _alpha - 10;
   }
   else
   {
      _alpha = _alpha + 10;
   }
}
