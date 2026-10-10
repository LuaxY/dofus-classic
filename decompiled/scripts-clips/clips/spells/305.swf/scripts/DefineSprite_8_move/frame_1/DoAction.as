c = 100;
xi = _X;
yi = _Y;
this.onEnterFrame = function()
{
   vx = _X - xi;
   vy = _Y - yi;
   _parent.attachMovie("cercle","cercle" + c,c);
   eval("_parent.cercle" + c)._x = _X;
   eval("_parent.cercle" + c)._y = _Y - 20;
   eval("_parent.cercle" + c).vx = vx;
   eval("_parent.cercle" + c).vy = vy;
   c++;
   xi = _X;
   yi = _Y;
};
