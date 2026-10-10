stop();
x1 = _parent.cellFrom.x;
y1 = _parent.cellFrom.y;
_X = x1;
_Y = y1;
x2 = _parent.cellTo.x;
y2 = _parent.cellTo.y;
acc = 0.8;
frott = 0.97;
vx = random(20) - 10;
vy = random(20) - 10;
this.onEnterFrame = function()
{
   if(fin != 1)
   {
      if(_X < x2)
      {
         vx += acc;
      }
      else
      {
         vx -= acc;
      }
      vx *= frott;
      _X = _X + vx;
      if(_Y < y2)
      {
         vy += acc;
      }
      else
      {
         vy -= acc;
      }
      vy *= frott;
      _Y = _Y + vy;
      anglepos = Math.atan2(_Y - y2,_X - x2);
      if(tps++ == 100)
      {
         gotoAndPlay(2);
         frott = 0.7;
         acc = 3;
      }
   }
};
