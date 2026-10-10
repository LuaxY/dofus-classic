Class_TabPlayDofus_TeamMateWaiting = function()
{
   this.init();
};
Class_TabPlayDofus_TeamMateWaiting.prototype = new Class_TabPlayDofus_TeamMateObject();
Object.registerClass("TabPlayDofus_TeamMateWaiting",Class_TabPlayDofus_TeamMateWaiting);
Class_TabPlayDofus_TeamMateWaiting.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.txtWainting.setText(getText("IN_WAINTING") + "...","Font1");
   _loc1_.bWaitingCmp = true;
   _loc1_.txtTeamMateName.setText(_loc1_.teamMateName,"Font1");
};
