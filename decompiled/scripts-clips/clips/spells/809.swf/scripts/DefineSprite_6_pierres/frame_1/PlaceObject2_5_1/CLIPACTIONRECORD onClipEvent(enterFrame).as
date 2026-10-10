onClipEvent(enterFrame){
   if(_alpha < 10)
   {
      removeMovieClip(_parent);
   }
   _parent._x += vx;
   _parent._y += vy;
   _rotation = _rotation + vr;
   if(tps++ < vd)
   {
      _Y = _Y + v;
      vx /= 1.2;
      vy /= 1.2;
      v /= 1.2;
   }
   if(tps++ > vd)
   {
      _Y = _Y + (v2y *= 1.2);
      _parent._y += 10;
      _X = _X + (v2x *= 1.2);
      _alpha = _alpha - 10;
   }
}
