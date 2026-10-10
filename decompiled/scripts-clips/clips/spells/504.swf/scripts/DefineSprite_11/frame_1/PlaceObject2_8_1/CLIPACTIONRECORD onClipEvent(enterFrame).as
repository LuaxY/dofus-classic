onClipEvent(enterFrame){
   if(Math.abs(_parent._xscale) > 95)
   {
      _alpha = Math.abs(_parent._xscale);
   }
   else
   {
      _alpha = 0;
   }
}
