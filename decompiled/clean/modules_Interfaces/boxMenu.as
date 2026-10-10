Class_boxMenu = function()
{
   this.init();
};
Class_boxMenu.prototype = new MovieClip();
Object.registerClass("boxMenu",Class_boxMenu);
Class_boxMenu.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.quit_btn._x = 40;
   _loc1_.disconnect_btn._x = 40;
   _loc1_.giveup_btn._x = 40;
   _loc1_.giveup_btn._visible = DATACENTER.Game.isRunning;
   _loc1_.cancel_btn._x = 40;
};
