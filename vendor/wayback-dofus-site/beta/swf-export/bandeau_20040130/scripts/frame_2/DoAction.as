xm = 0;
ym = 0;
change = 0;
imobili = 1;
imo1 = 0;
imo2 = 0;
p1 = _level0.choix1;
p2 = _level0.choix2;
sens = 1;
loadMovie("swf/perso/" + p1 + ".swf",ensemble.illu.perso);
loadMovie("swf/perso/" + p2 + ".swf",ensemble.illu2.perso);
ensemble.illu2.perso.gotoAndStop(10);
this.onEnterFrame = function()
{
   imo1 = _ymouse;
   if(imo1 == imo2)
   {
      imobili = 1;
   }
   else
   {
      imobili = 0;
   }
   imo2 = _ymouse;
   if(imobili == 1 and sens == 1)
   {
      xm += 4;
   }
   if(xm > 600)
   {
      sens = 2;
   }
   if(imobili == 1 and sens == 2)
   {
      xm -= 4;
   }
   if(xm < 0)
   {
      sens = 1;
   }
   p += 0.05;
   if(imobili == 1)
   {
      ym += Math.cos(p) * 2;
   }
   if(xm < _xmouse and _ymouse < 110 and _xmouse > 50 and _xmouse < 700)
   {
      xm += Math.abs(_xmouse - xm) / 10;
   }
   if(xm > _xmouse and _ymouse < 110 and _xmouse > 50 and _xmouse < 700)
   {
      xm -= Math.abs(_xmouse - xm) / 10;
   }
   if(ym < _ymouse and _ymouse < 110 and _xmouse > 50 and _xmouse < 700)
   {
      ym += Math.abs(_ymouse - ym) / 10;
   }
   if(ym > _ymouse and _ymouse < 110 and _xmouse > 50 and _xmouse < 700)
   {
      ym -= Math.abs(_ymouse - ym) / 10;
   }
   decor._x = 750 - xm / 50 - 750;
   decor._y = 107 - ym / 50 - 107;
   ensemble.illu._x = xm / 5 + 200;
   ensemble.illu._y = ym / 10 + 100;
   ensemble.illu2._x = 750 - xm / 5 - 150;
   ensemble.illu2._y = ym / 10 + 100;
   if(ensemble.illu.hitTest(ensemble.illu2))
   {
      vs.gotoAndStop(1);
   }
   else
   {
      vs.gotoAndStop(2);
   }
};
