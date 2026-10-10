corpsx = corps._x;
tetex = tete._x;
dpate = 10;
this.onEnterFrame = function()
{
   corps._x = corpsx * Math.cos(an);
   corps._y = corpsx / 2 * Math.sin(an);
   tete._x = tetex * Math.cos(an);
   tete._y = tetex / 2 * Math.sin(an);
   c = 1;
   while(c < 5)
   {
      eval("p" + c)._x = dpate * Math.cos(an + c * 3.1415 / 2);
      eval("p" + c)._y = dpate / 2 * Math.sin(an + c * 3.1415 / 2);
      c++;
   }
};
