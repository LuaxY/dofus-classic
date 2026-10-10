c = 1;
this.onEnterFrame = function()
{
   if(c < 20)
   {
      c++;
      p = c;
      while(p < _parent._parent.level + c)
      {
         this.attachMovie("fumee","fumee" + p,p);
         eval("this.fumee" + p).vx = 20 * (Math.random() - 0.5);
         eval("this.fumee" + p).vy = 20 * (Math.random() - 0.5);
         p++;
      }
   }
};
