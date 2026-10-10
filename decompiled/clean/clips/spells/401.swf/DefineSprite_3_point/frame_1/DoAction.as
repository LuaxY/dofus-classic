rx = 15;
ry = 10;
p = -50;
_Y = -200;
y2 = _Y;
_xscale = sz;
_yscale = sz;
this.onEnterFrame = function()
{
   if(t > 17)
   {
      removeMovieClip(this);
   }
   t = _parent.t / 4 + dec / 8;
   _X = rx * Math.cos(t);
   y = ry * Math.sin(t);
   y2 = y + (p += 0.5);
   _Y = _Y - (_Y - y2) / 5;
   if(y < 0)
   {
      _alpha = 100 + y * 10;
   }
};
