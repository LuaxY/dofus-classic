Class_TabPlayDofus_TeamMateFree = function()
{
   this.txtAddTeamMate.setText(getText("FREE_TEAMMATE"),"Font1");
};
Class_TabPlayDofus_TeamMateFree.prototype = new Class_TabPlayDofus_TeamMateObject();
Object.registerClass("TabPlayDofus_TeamMateFree",Class_TabPlayDofus_TeamMateFree);
Class_TabPlayDofus_TeamMateFree.prototype.clear = function()
{
   super.clear();
   this._visible = false;
};
Class_TabPlayDofus_TeamMateFree.prototype.update = function(fArray)
{
   var _loc2_ = fArray;
   var _loc3_ = this;
   _loc3_.lstFriends.removeAll();
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.length)
   {
      _loc3_.lstFriends.addItem(_loc2_[_loc1_].name,_loc2_[_loc1_].id);
      _loc1_ = _loc1_ + 1;
   }
   _loc3_.lstFriends.setSelectedIndex(0);
};
