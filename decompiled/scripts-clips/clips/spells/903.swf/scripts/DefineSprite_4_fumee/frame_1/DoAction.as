a = _parent._parent._parent.rotate._rotation * 0.017453292519943295;
t = 80 * Math.random() + 50;
_xscale = t;
_yscale = t;
_X = 20 * (Math.random() - 0.5);
_Y = 20 * (Math.random() - 0.5);
vx = 20 * Math.cos(a);
vy = 20 * Math.sin(a);
deceleration = 1.2 + Math.random();
this.onEnterFrame = function()
{
   _X = _X + vx;
   _Y = _Y + vy;
   vx /= deceleration;
   vy /= deceleration;
};
