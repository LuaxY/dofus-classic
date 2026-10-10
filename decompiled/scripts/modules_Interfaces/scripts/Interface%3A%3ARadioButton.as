Class_Interface_RadioButton = function()
{
   this.init();
};
Class_Interface_RadioButton.prototype = new MovieClip();
Object.registerClass("Interface::RadioButton",Class_Interface_RadioButton);
Class_Interface_RadioButton.prototype.onClick = null;
Class_Interface_RadioButton.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.select(false);
   var _loc2_ = new Color(_loc1_.background_mc);
   _loc2_.setRGB(_loc1_.bgColor);
};
Class_Interface_RadioButton.prototype.select = function(bool)
{
   this.selectRound._visible = bool;
   this.bSelected = bool;
};
Class_Interface_RadioButton.prototype.setEnabled = function(bool)
{
   var _loc1_ = this;
   if(bool)
   {
      _loc1_.onRelease = _loc1_.onClick;
   }
   else
   {
      delete _loc1_.onRelease;
   }
};
