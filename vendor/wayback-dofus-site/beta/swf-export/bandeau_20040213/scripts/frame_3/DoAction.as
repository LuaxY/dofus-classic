function highLight()
{
   var _loc1_ = this;
   if(_loc1_.nbFrames == undefined)
   {
      _loc1_.nbFrames = 0;
   }
   else if(_loc1_.nbFrames > 10)
   {
      delete _loc1_.nbFrames;
      delete _loc1_.onEnterFrame;
      return;
   }
   var c = new Color(_loc1_);
   var _loc3_ = 100 * (_loc1_.nbFrames / 10);
   var _loc2_ = 255 * (1 - _loc1_.nbFrames / 10);
   c.setTransform({ra:_loc3_,rb:_loc2_,ga:_loc3_,gb:_loc2_,ba:_loc3_,bb:_loc2_,aa:"100",ab:"0"});
   _loc1_.nbFrames = _loc1_.nbFrames + 1;
}
xm = 0;
ym = 0;
change = 0;
imobili = 1;
imo1 = 0;
imo2 = 0;
p1 = _level0.choix1;
p2 = _level0.choix2;
sens = 1;
ensemble.perso1.onEnterFrame = highLight;
ensemble.perso2.onEnterFrame = highLight;
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
   if(imobili == 1)
   {
      if(sens == 1)
      {
         xm += 4;
      }
      if(xm > 600)
      {
         sens = 2;
      }
      if(sens == 2)
      {
         xm -= 4;
      }
      if(xm < 0)
      {
         sens = 1;
      }
      p += 0.05;
      ym += Math.cos(p) * 2;
   }
   if(_xmouse > xm and _ymouse < 110 and _xmouse > 50 and _xmouse < 700)
   {
      xm += Math.abs(_xmouse - xm) / 10;
   }
   else if(_xmouse < xm and _ymouse < 110 and _xmouse > 50 and _xmouse < 700)
   {
      xm -= Math.abs(_xmouse - xm) / 10;
   }
   if(_ymouse > ym and _ymouse < 110 and _xmouse > 50 and _xmouse < 700)
   {
      ym += Math.abs(_ymouse - ym) / 10;
   }
   else if(_ymouse < ym and _ymouse < 110 and _xmouse > 50 and _xmouse < 700)
   {
      ym -= Math.abs(_ymouse - ym) / 10;
   }
   ensemble.decor._x = (- xm) / 50 - ensemble._x;
   ensemble.decor._y = (- ym) / 50 - ensemble._y;
   ensemble.perso1._x = Math.floor(xm / 6 + 200);
   ensemble.perso1._y = Math.floor(ym / 10 + 100);
   ensemble.perso2._x = Math.floor(750 - xm / 6 - 150);
   ensemble.perso2._y = Math.floor(ym / 10 + 100);
   if(ensemble.perso1.hitTest(ensemble.perso2))
   {
      vs.gotoAndStop(1);
   }
   else
   {
      vs.gotoAndStop(2);
   }
};
