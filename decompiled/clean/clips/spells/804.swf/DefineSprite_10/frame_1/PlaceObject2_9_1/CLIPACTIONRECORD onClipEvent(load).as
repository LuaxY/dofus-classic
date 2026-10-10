onClipEvent(load){
   gotoAndPlay(random(10) + 1);
   ta = _parent._parent.ta;
   r = Math.random() * ta;
   v = 5 * r;
   _alpha = 120;
}
