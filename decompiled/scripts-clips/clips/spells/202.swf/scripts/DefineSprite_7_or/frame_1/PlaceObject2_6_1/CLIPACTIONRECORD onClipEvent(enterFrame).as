onClipEvent(enterFrame){
   _parent._x += vx;
   _parent._y += vy;
   if(t == 1)
   {
      _alpha = _alpha - 5;
      if(_alpha <= 5)
      {
         _parent.removeMovieClip();
      }
   }
   if(t != 1)
   {
      _Y = _Y + v;
      _rotation = _rotation + vr;
      v /= 1.3;
      vr /= 1.03;
      if(m++ > tm)
      {
         t = 1;
      }
      if(_Y > 0)
      {
         vx /= 2;
         vy /= 2;
         _rotation = 0;
         _Y = 0;
         v = (- v) / 4;
      }
   }
}
