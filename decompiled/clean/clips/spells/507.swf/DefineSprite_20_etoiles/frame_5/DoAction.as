stop();
accy = 0.3;
tf = 30 + random(30);
vy = -3 * Math.random();
this.onEnterFrame = function()
{
   _Y = _Y + vy;
   vy *= 0.9;
   if(t++ > tf & end != 1)
   {
      play();
      end = 1;
   }
};
