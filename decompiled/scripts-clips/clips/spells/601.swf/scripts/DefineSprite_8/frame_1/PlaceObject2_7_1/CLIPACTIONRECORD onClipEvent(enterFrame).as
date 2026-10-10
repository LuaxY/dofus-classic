onClipEvent(enterFrame){
   if(_Y < _parent.p)
   {
      vrot2 /= 1.04;
      _xscale = 50 * Math.sin(i += vrot2);
      _rotation = _rotation + vrot;
   }
}
