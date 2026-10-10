onClipEvent(load){
   d = 120 + (_parent._parent._parent.level - 1) * 32;
   accx = 0.8 + 0.12 * Math.random();
   x = d * MAth.random();
   if(random(2) == 1)
   {
      _Y = 5;
      sr = -1;
   }
   else
   {
      sr = 1;
      _Y = -5;
   }
   _xscale = 0;
   _yscale = 0;
   t = 5;
   _X = x;
   va = 5 + 10 * Math.random();
   vr = (20 + 40 * MAth.random()) * sr;
   vt = (1 + random(1)) * ((d - x) / d);
   vx = 5 + 10 * MAth.random();
}
