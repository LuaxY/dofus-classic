stop();
accx = 0.3 + 0.3 * Math.random();
accy = 0.3;
tf = 30 + random(30);
vy = -3 - 10 * Math.random();
this.onEnterFrame = function()
{
   if(_X < 0)
   {
      vx += accx;
   }
   if(_X > 0)
   {
      vx -= accx;
   }
   if(_Y < -20)
   {
      vy += accy;
   }
   if(_Y > -20)
   {
      vy -= accy;
   }
   _X = _X + vx;
   _Y = _Y + vy;
   vx *= 0.99;
   vy *= 0.95;
   if(t++ > tf & end != 1)
   {
      play();
      end = 1;
   }
};
