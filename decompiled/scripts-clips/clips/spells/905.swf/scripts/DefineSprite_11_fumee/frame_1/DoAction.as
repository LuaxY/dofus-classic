t = 50 * Math.random() + 50;
gotoAndPlay(random(10));
_xscale = t;
_yscale = t;
vx /= 3 + 3 * Math.random();
vy /= 3 + random(3);
this.onEnterFrame = function()
{
   _X = _X + vx;
   _Y = _Y + vy;
   vx /= 1.2;
   vy /= 1.2;
};
