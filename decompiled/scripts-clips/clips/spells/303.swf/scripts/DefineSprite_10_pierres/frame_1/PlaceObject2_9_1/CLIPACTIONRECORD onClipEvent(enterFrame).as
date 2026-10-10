onClipEvent(enterFrame){
   _parent._x += vx;
   _parent._y += vy;
   if(t == 1)
   {
      _alpha = _alpha - 10;
      if(_alpha <= 5)
      {
         _parent.removeMovieClip();
      }
   }
   if(t != 1)
   {
      _Y = _Y + v;
      _rotation = _rotation + vr;
      v += 1.5;
      if(_Y > 0)
      {
         vx /= 2;
         vy /= 2;
         _rotation = 0;
         _Y = 0;
         v = (- v) / 4;
         if(Math.abs(v) < 1)
         {
            vx = 0;
            vy = 0;
            t = 1;
         }
      }
   }
}
