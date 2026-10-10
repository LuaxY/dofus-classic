onClipEvent(enterFrame){
   if(_alpha > 0)
   {
      _Y = _Y + v;
      v += 0.5;
      _alpha = _alpha - va;
   }
}
