_parent.i = -3.1415;
this.onEnterFrame = function()
{
   if(c < 20)
   {
      this.attachMovie("tige","tige" + c,c);
      c += 1;
      _root.i += 0.3;
   }
};
