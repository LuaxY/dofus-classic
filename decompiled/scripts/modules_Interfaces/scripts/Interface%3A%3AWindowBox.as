Class_WindowBox = function()
{
   this.init();
};
Class_WindowBox.prototype = new MovieClip();
Object.registerClass("Interface::WindowBox",Class_WindowBox);
Class_WindowBox.prototype.init = function()
{
   var _loc1_ = this;
   var _loc2_;
   if(_loc1_.containerSymbol == undefined)
   {
      _loc1_.hide();
   }
   else
   {
      _loc2_ = _loc1_.attachMovie("Interface::Window","window_mc",10,{owner:_loc1_,title:_loc1_.title,containerSymbol:_loc1_.containerSymbol,containerParams:_loc1_.containerParams});
      _loc2_._x = (Stage.width - _loc2_._width) / 2;
      _loc2_._y = (Stage.height - _loc2_._height) / 2;
   }
};
Class_WindowBox.prototype.hide = function()
{
   KERNEL.KeyListener.setEnabled(true);
   this.removeMovieClip();
};
