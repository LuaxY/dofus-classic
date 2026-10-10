vro = random(600) - 300;
t = random(_parent.t) + _parent.t;
_xscale = 0;
_yscale = 0;
this.onEnterFrame = function()
{
   _rotation = _rotation + vro;
   vro /= 1.5;
   _xscale = _xscale + t;
   _yscale = _yscale + t;
   t /= 1.6;
};
