onClipEvent(load){
   t = 40 + random(60);
   _xscale = t;
   duree = 40 + random(30);
   _yscale = t;
   vy = -5 - 15 * Math.random();
   vx = -10 + 20 * Math.random();
   vch = 0.2 + 0.3 * Math.random();
   vr = 0.1 + 0.3 * Math.random();
   amp = 30 + random(70);
}
