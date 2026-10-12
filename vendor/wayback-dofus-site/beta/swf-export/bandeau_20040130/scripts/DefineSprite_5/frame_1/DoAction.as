ampx = 50 + 5 * Math.random();
ampy = 50 + 5 * Math.random();
vx = 5 + 10 * Math.random();
vy = 5 + 10 * Math.random();
_visible = 0;
this.onEnterFrame = function()
{
   _parent._x = ampx * Math.cos(ix += vx / 300);
   _parent._y = ampy * Math.cos(iy += vy / 300);
};
