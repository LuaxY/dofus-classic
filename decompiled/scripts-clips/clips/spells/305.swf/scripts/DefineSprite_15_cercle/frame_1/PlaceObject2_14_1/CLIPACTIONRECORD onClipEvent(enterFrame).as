onClipEvent(enterFrame){
   if(_alpha < 10)
   {
      _parent.removeMovieClip();
   }
   _alpha = _alpha - va;
   _X = _X + _parent.vx;
   _Y = _Y + _parent.vy;
   _parent.vx /= r;
   _parent.vy /= r;
}
