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
   _rotation = _rotation;
   _Y = 5 * (r += 0.01) * Math.cos(i) + (p -= v);
   _X = 25 * r * Math.sin(i += v2);
   if(Math.sin(i) > 0)
   {
      _alpha = _alpha - 4;
   }
   else
   {
      _alpha = _alpha + 4;
   }
}
