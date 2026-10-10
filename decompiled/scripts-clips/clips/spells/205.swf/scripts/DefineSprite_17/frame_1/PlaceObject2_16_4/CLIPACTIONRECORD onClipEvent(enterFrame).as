onClipEvent(enterFrame){
   _X = 7 * Math.cos(_parent._parent.an);
   _xscale = 100 * Math.sin(_parent._parent.an);
   if(_xscale < 0)
   {
      _visible = 0;
   }
   else
   {
      _visible = 1;
   }
}
