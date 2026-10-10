t = 20 * Math.random() + 80;
gotoAndPlay(random(15));
_xscale = t;
_yscale = t;
vx *= 2;
vy *= 2;
this.onEnterFrame = function()
{
   _X = _X + vx;
   _Y = _Y + vy;
   vx /= 1.3;
   vy /= 1.3;
};
