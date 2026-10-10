Class_Interface_CheckBox = function()
{
   this.init();
};
Class_Interface_CheckBox.prototype = new MovieClip();
Object.registerClass("Interface::CheckBox",Class_Interface_CheckBox);
Class_Interface_CheckBox.prototype.onClick = null;
Class_Interface_CheckBox.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.select(false);
   var _loc2_ = new Color(_loc1_.background_mc);
   _loc2_.setRGB(_loc1_.bgColor);
};
Class_Interface_CheckBox.prototype.select = function(bool)
{
   this.selectRound._visible = bool;
   this.bSelected = bool;
};
Class_Interface_CheckBox.prototype.setEnabled = function(bool)
{
   var _loc1_ = this;
   if(bool)
   {
      _loc1_.onRelease = _loc1_.onClick;
      _loc1_.onRollOver = function()
      {
         INTERFACE.drawToolTip(this.tooltipText,10,-10,true);
      };
      _loc1_.onRollOut = function()
      {
         INTERFACE.hideToolTip();
      };
   }
   else
   {
      delete _loc1_.onRelease;
   }
};
Class_Interface_CheckBox.prototype.setToolTip = function(txt)
{
   this.tooltipText = txt;
};
