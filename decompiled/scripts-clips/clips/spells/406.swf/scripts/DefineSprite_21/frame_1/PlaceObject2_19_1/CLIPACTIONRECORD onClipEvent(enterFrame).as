onClipEvent(enterFrame){
   _X = _X + v;
   _alpha = _alpha - va;
   if(c < 4 * _parent._parent._parent.level)
   {
      _parent.attachMovie("goutte","goutte" + c,c + 1);
      eval("_parent.goutte" + c)._x = _X;
      c++;
   }
   v /= 1.2;
}
