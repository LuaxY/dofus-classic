this.onEnterFrame = function()
{
   f = _currentframe + t;
   if(f > _totalframes)
   {
      f -= _totalframes;
   }
   gotoAndPlay(f);
   if(a++ % 20 == 1)
   {
      t += 1;
   }
};
