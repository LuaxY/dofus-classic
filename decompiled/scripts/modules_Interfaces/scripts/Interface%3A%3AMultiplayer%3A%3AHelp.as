Class_InterfaceMultiPlayerHelp = function()
{
   this.tabLayers = ["HelpStart","HelpGameJoined","HelpJoinGame","HelpPlayDofus","HelpFriends","HelpPlayDofusStart"];
};
Class_InterfaceMultiPlayerHelp.prototype = new MovieClip();
Object.registerClass("Interface::MultiPlayer::Help",Class_InterfaceMultiPlayerHelp);
Class_InterfaceMultiPlayerHelp.prototype.showLayer = function(layerID)
{
   var _loc2_ = this;
   var _loc3_ = _loc2_.tabLayers[layerID];
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.tabLayers.length)
   {
      _loc2_[_loc2_.tabLayers[_loc1_]]._visible = false;
      _loc1_ = _loc1_ + 1;
   }
   _loc2_[_loc3_]._visible = true;
};
