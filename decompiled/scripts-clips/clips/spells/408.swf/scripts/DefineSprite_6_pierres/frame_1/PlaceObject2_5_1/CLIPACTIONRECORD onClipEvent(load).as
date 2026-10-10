onClipEvent(load){
   vd = 30 + random(30);
   gotoAndPlay(random(4) + 1);
   vx = 15 * (Math.random() - 0.5);
   vy = 15 * (Math.random() - 0.5);
   an = _parent._parent._parent._parent._parent.angle + 3.1415;
   v2x = Math.cos(an) * 5;
   v2y = Math.sin(an) * 5;
   _parent._x = 20 * (Math.random() - 0.5);
   _parent._y = 10 * (Math.random() - 0.5);
   t = 60 + 40 * Math.random();
   v = -10;
   _xscale = t;
   _yscale = t;
   vr = 60 * (-0.5 + Math.random());
}
