onClipEvent(enterFrame){
   _xscale = 80 + 1.3 * r;
   _yscale = 80 + 1.3 * r;
   _alpha = _alpha - 1 - r / 20;
   _X = _X + v;
   v /= 1.2;
}
