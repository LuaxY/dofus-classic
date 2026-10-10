t = 50 * Math.random() + 50;
_xscale = t;
_yscale = t;
vx /= 1 + 3 * Math.random();
vy /= 3;
this.onEnterFrame = function()
{
   _X = _X + vx;
   _Y = _Y + vy;
   vx /= 1.3;
   vy /= 1.3;
};
