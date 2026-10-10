this.setColor = function(col)
{
   var _loc1_ = new Color(this.circle);
   _loc1_.setRGB(col);
};
this.animate = function(bool)
{
   if(bool)
   {
      this.circle.play();
   }
   else
   {
      this.circle.gotoAndStop(1);
   }
};
