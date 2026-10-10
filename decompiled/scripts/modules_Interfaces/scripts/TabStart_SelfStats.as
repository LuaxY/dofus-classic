Class_TabStart_SelfStats = function()
{
   var _loc1_ = this;
   _loc1_.init();
   INTERFACE.addToListner(_loc1_);
   DATACENTER.Player.data.addListener(_loc1_);
};
Class_TabStart_SelfStats.prototype = new MovieClip();
Object.registerClass("TabStart_SelfStats",Class_TabStart_SelfStats);
Class_TabStart_SelfStats.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.txtTitle.setText(getText("USER_STATS"),"Font1");
   var _loc2_ = _loc1_.attachMovie("Interface::ProgressBar","XPProgressbar",10);
   _loc2_.init(100,10,65,74);
   _loc1_.onSetXP(DATACENTER.Player.data.XP);
   _loc1_.onSetLevel(DATACENTER.Player.data.level);
};
Class_TabStart_SelfStats.prototype.onSetXP = function(value)
{
   var _loc2_ = value;
   this.txtXPValue.setText(getText("EXPERIMENT") + " : " + _loc2_,"Font1");
   var _loc1_ = DATACENTER.Player.data;
   var low = _loc1_.XPlow;
   var _loc3_ = _loc1_.XPhigh - _loc1_.XPlow;
   _loc2_ -= low;
   this.XPProgressbar.update(_loc2_,_loc3_);
};
Class_TabStart_SelfStats.prototype.onSetLevel = function(value)
{
   this.txtLevel.setText(getText("LEVEL") + " " + value,"Font1");
};
