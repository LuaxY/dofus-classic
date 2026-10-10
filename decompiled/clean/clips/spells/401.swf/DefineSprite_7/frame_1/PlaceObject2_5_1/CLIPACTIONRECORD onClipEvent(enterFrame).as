onClipEvent(enterFrame){
   if(_parent.t < 20 & _parent.t % 3 == 1)
   {
      _parent.attachMovie("point","point" + _parent.t,_parent.t + 100);
      eval("_parent.point" + _parent.t).sz = 200 * Math.sin(_parent.t / 10);
      eval("_parent.point" + _parent.t).dec = _parent.t;
      eval("_parent.point" + _parent.t)._y = -200;
   }
   _parent.t++;
}
