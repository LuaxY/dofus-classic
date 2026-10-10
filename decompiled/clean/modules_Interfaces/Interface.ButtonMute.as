Class_Interface_ButtonMute = function()
{
   this.init();
};
Class_Interface_ButtonMute.prototype = new MovieClip();
Object.registerClass("Interface::ButtonMute",Class_Interface_ButtonMute);
Class_Interface_ButtonMute.prototype.onChange = null;
Class_Interface_ButtonMute.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.attachMovie(_loc1_.backSymbol,"background_mc",10);
   _loc1_.active_mc.swapDepths(20);
   _loc1_.select(false);
};
Class_Interface_ButtonMute.prototype.select = function(bool)
{
   this.active_mc._visible = bool;
   this.bSelected = bool;
};
Class_Interface_ButtonMute.prototype.setEnabled = function(bool)
{
   var _loc1_ = this;
   if(bool)
   {
      _loc1_.onRelease = _loc1_.Release;
      _loc1_.onRollOver = function()
      {
         var _loc1_ = this;
         INTERFACE.drawToolTip(_loc1_.tooltipText,-110,20,true,undefined,undefined,true);
         _loc1_.background_mc._xscale = _loc1_.background_mc._yscale = 110;
      };
      _loc1_.onRollOut = _loc1_.onReleaseOutside = function()
      {
         INTERFACE.hideToolTip();
         this.background_mc._xscale = this.background_mc._yscale = 100;
      };
   }
   else
   {
      delete _loc1_.onRelease;
   }
};
Class_Interface_ButtonMute.prototype.setToolTip = function(txt)
{
   this.tooltipText = txt;
};
Class_Interface_ButtonMute.prototype.Release = function()
{
   var _loc1_ = this;
   _loc1_.select(!_loc1_.bSelected);
   _loc1_.onChange(_loc1_.bSelected);
};
