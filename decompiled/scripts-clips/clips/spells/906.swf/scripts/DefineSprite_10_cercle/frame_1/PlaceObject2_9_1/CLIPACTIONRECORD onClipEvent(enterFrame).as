onClipEvent(enterFrame){
   _rotation = _rotation - (vr *= 0.97);
   _X = _X + (vx *= accx);
   t += vt -= 0.1;
   _xscale = t;
   _yscale = t;
   if(t < 0)
   {
      _parent.removeMovieClip();
   }
}
