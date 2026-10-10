roti = _parent._parent.roti - 30 + 60 * Math.random();
c._rotation = roti;
dv = 1.05 + 0.2 * Math.random();
v = 3 + 10 * MAth.random();
vx = v * Math.cos(roti * 3.141592653589793 / 180);
vy = v * Math.sin(roti * 3.141592653589793 / 180);
p = 60 - random(30);
cacc = 1.3 + 0.3 * Math.random();
this.onEnterFrame = function()
{
   if(c._y < p)
   {
      c._y += cacc;
      _X = _X + vx;
      _Y = _Y + vy;
      vx /= dv;
      vy /= dv;
   }
};
