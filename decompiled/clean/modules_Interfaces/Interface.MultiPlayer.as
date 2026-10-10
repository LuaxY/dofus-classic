Class_InterfaceMultiPlayer = function()
{
   this.init();
};
Class_InterfaceMultiPlayer.prototype = new MovieClip();
Object.registerClass("Interface::MultiPlayer",Class_InterfaceMultiPlayer);
Class_InterfaceMultiPlayer.prototype.init = function()
{
   var _loc1_ = this;
   AKS.Chat.output = _loc1_;
   _loc1_.onEnterFrame = function()
   {
      var _loc1_ = this;
      _loc1_.btnPlayDofus.setLabel(getText("PLAY_DOFUS"));
      _loc1_.btnMulti.setLabel(getText("MULTI_GAME"));
      _loc1_.btnFriends.setLabel(getText("FRIENDS"));
      _loc1_.btnReturn.setLabel(getText("RETURN_TO_VILLAGE"));
      _loc1_.btnSend.setLabel(getText("SEND"));
      _loc1_.txtChannel.setText(getText("CHANNEL") + " : ","Font1");
      delete _loc1_.onEnterFrame;
   };
   INTERFACE.Text.clearText();
   _loc1_.txtConsole.onSetFocus = function()
   {
      this._parent.comboChannels.myOnKillFocus();
   };
   Selection.addListener(_loc1_.txtConsole);
};
Class_InterfaceMultiPlayer.prototype.clearForNewChat = function(channelName)
{
   CHAT.clear();
   CHAT.refresh();
   this.removeAllUsers();
   if(channelName != undefined)
   {
      KERNEL.traceToChat(getText("YOU_ARE_IN_CHANNEL",[DATACENTER.Channel.m_name]),INFO_CHAT_COLOR);
   }
   this.setChannel(channelName);
};
Class_InterfaceMultiPlayer.prototype.addChannel = function(name)
{
   this.comboChannels.addItem(name);
   this.comboChannels.sortItemsBy("label","ASC");
};
Class_InterfaceMultiPlayer.prototype.setChannel = function(name)
{
   var _loc1_ = this;
   var _loc3_ = name;
   var _loc2_;
   if(_loc3_ == undefined)
   {
      _loc1_.comboChannels.setEnabled(false);
      _loc1_.comboChannels.setValue(DATACENTER.Game.m_name);
   }
   else
   {
      _loc1_.comboChannels.setEnabled(true);
      _loc2_ = _loc1_.FindItem(_loc1_.comboChannels,_loc3_);
      if(_loc2_ == -1)
      {
         _loc1_.comboChannels.setValue(_loc3_);
      }
      else
      {
         _loc1_.comboChannels.enabledEvent = false;
         _loc1_.comboChannels.setSelectedIndex(_loc2_);
         _loc1_.comboChannels.enabledEvent = true;
      }
   }
};
Class_InterfaceMultiPlayer.prototype.addUser = function(user)
{
   this.lstUsers.addItem(user,user.name);
};
Class_InterfaceMultiPlayer.prototype.removeUser = function(user)
{
   var _loc2_ = this;
   var _loc1_ = _loc2_.FindItem(_loc2_.lstUsers,user.name);
   if(_loc1_ != -1)
   {
      _loc2_.lstUsers.removeItemAt(_loc1_);
   }
};
Class_InterfaceMultiPlayer.prototype.removeAllUsers = function()
{
   this.lstUsers.removeAll();
};
Class_InterfaceMultiPlayer.prototype.FindItem = function(cmp, value)
{
   var _loc3_ = cmp;
   var _loc1_;
   var _loc2_ = _loc3_.getLength();
   _loc1_ = 0;
   while(_loc1_ < _loc2_)
   {
      if(_loc3_.getItemAt(_loc1_).data == value)
      {
         return _loc1_;
      }
      _loc1_ = _loc1_ + 1;
   }
   return -1;
};
Class_InterfaceMultiPlayer.prototype.removeAllUsers = function()
{
   this.lstUsers.removeAll();
};
