Class_TabPlayDofus_TeamMateChoose = function()
{
   this.txtAddTeamMate.setText(getText("ADD_TEAMMATE"),"Font1");
};
Class_TabPlayDofus_TeamMateChoose.prototype = new Class_TabPlayDofus_TeamMateObject();
Object.registerClass("TabPlayDofus_TeamMateChoose",Class_TabPlayDofus_TeamMateChoose);
Class_TabPlayDofus_TeamMateChoose.prototype.clear = function()
{
   super.clear();
   this._visible = false;
};
Class_TabPlayDofus_TeamMateChoose.prototype.update = function(fArray)
{
   var _loc2_ = fArray;
   var _loc3_ = this;
   _loc3_.Blink.play();
   _loc3_.lstFriends.removeAll();
   _loc3_.lstFriends.addItem(String(getText("RANDOM")),0);
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.length)
   {
      _loc3_.lstFriends.addItem(_loc2_[_loc1_].name,_loc2_[_loc1_].id);
      _loc1_ = _loc1_ + 1;
   }
   _loc3_.lstFriends.setSelectedIndex(0);
};
