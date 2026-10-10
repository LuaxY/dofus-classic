onClipEvent(load){
   vx = 5 * (Math.random() - 0.5);
   tm = 20 + random(40);
   vy = 2 * (Math.random() - 0.5);
   _parent._x = 20 * (Math.random() - 0.5);
   _parent._y = 10 * (Math.random() - 0.5);
   t = 60 + 40 * Math.random();
   _xscale = t;
   _alpha = 20 + random(90);
   _yscale = t;
   v = -25 * MAth.random() - 25;
   vr = 140 * (-0.5 + Math.random());
}
