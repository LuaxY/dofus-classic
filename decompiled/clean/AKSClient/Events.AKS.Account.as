AKS.Account.onGetCharacters = function(characArray)
{
   var _loc1_ = INTERFACE.draw("Interface::Characters",1);
   _loc1_.setCharacters(characArray);
   SOMA.onGetCharacters();
};
AKS.Account.onSetCharacter = function(success, param1)
{
   if(success)
   {
      INTERFACE.clear();
      AKS.Game.createSolo();
   }
   else
   {
      this.onError(param1);
   }
};
AKS.Account.onWhoAmI = function(playerName, characterName, state, param)
{
   var _loc1_ = playerName;
   var _loc2_ = characterName;
   var _loc3_ = param;
   switch(state)
   {
      case AKS.STATE_IN_CHANNEL:
         KERNEL.traceToChat(getText("I_AM_IN_CHANNEL",[_loc2_,_loc1_,_loc3_]),INFO_CHAT_COLOR);
         return;
      case AKS.STATE_IN_GAME_UNKNOWN:
         KERNEL.traceToChat(getText("I_AM_ENTERING_GAME",[_loc2_,_loc1_]),INFO_CHAT_COLOR);
         return;
      case AKS.STATE_IN_GAME_FREE:
         KERNEL.traceToChat(getText("I_AM_IN_OPEN_GAME",[_loc2_,_loc1_,_loc3_]),INFO_CHAT_COLOR);
         return;
      case AKS.STATE_IN_GAME_RANDOM:
         KERNEL.traceToChat(getText("I_AM_IN_CLOSE_GAME",[_loc2_,_loc1_,_loc3_]),INFO_CHAT_COLOR);
         return;
      case AKS.STATE_IN_GAME_SOLO:
         KERNEL.traceToChat(getText("I_AM_IN_SINGLE_GAME",[_loc2_,_loc1_]),INFO_CHAT_COLOR);
         return;
      default:
         KERNEL.traceToChat(getText("I_AM_BUT_WHERE",[_loc2_,_loc1_]),ERROR_CHAT_COLOR);
         return;
   }
};
AKS.Account.onWhoIs = function(playerName, characterName, state, param)
{
   var _loc1_ = playerName;
   var _loc2_ = characterName;
   var _loc3_ = param;
   switch(state)
   {
      case AKS.STATE_IN_CHANNEL:
         KERNEL.traceToChat(getText("IS_IN_CHANNEL",[_loc2_,_loc1_,_loc3_]),INFO_CHAT_COLOR);
         return;
      case AKS.STATE_IN_GAME_UNKNOWN:
         KERNEL.traceToChat(getText("IS_ENTERING_GAME",[_loc2_,_loc1_]),INFO_CHAT_COLOR);
         return;
      case AKS.STATE_IN_GAME_FREE:
         KERNEL.traceToChat(getText("IS_IN_OPEN_GAME",[_loc2_,_loc1_,_loc3_]),INFO_CHAT_COLOR);
         return;
      case AKS.STATE_IN_GAME_RANDOM:
         KERNEL.traceToChat(getText("IS_INCLOSE_GAME",[_loc2_,_loc1_,_loc3_]),INFO_CHAT_COLOR);
         return;
      case AKS.STATE_IN_GAME_SOLO:
         KERNEL.traceToChat(getText("IS_IN_SINGLE_GAME",[_loc2_,_loc1_]),INFO_CHAT_COLOR);
         return;
      default:
         KERNEL.traceToChat(getText("IS_BUT_WHERE",[_loc2_,_loc1_]),ERROR_CHAT_COLOR);
         return;
   }
};
AKS.Account.onAddFriend = function(success, name)
{
   if(success)
   {
      KERNEL.traceToChat(getText("ADD_TO_FRIEND_LIST",[name]),INFO_CHAT_COLOR);
   }
   else
   {
      switch(name)
      {
         case "f":
            KERNEL.traceToChat(getText("CANT_ADD_FRIEND_NOT_FOUND"),ERROR_CHAT_COLOR);
            break;
         case "y":
            KERNEL.traceToChat(getText("CANT_ADD_YOU"),ERROR_CHAT_COLOR);
            break;
         case "a":
            KERNEL.traceToChat(getText("ALREADY_YOUR_FRIEND"),ERROR_CHAT_COLOR);
         default:
            return;
      }
   }
};
AKS.Account.onFriendslist = function()
{
   var out = AKS.Account.output;
   var _loc1_ = DATACENTER.Player.Friends;
   var _loc3_ = "";
   var _loc2_;
   if(out._name != undefined)
   {
      out.lstOnlineFriends.removeAll();
      out.lstOffLineFriends.removeAll();
      _loc2_ = 0;
      while(_loc2_ < _loc1_.length)
      {
         if(_loc1_[_loc2_].account.length != 0)
         {
            if(_loc1_[_loc2_].state != "DISCONNECT")
            {
               out.lstOnlineFriends.addItem(_loc1_[_loc2_],_loc1_[_loc2_].name);
            }
            else
            {
               out.lstOffLineFriends.addItem(_loc1_[_loc2_],_loc1_[_loc2_].account);
            }
         }
         _loc2_ = _loc2_ + 1;
      }
   }
   else
   {
      if(_loc1_.length != 0)
      {
         KERNEL.traceToChat("<b>" + getText("YOUR_FRIEND_LIST") + " :</b>",INFO_CHAT_COLOR);
      }
      else
      {
         KERNEL.traceToChat(getText("EMPTY_FRIEND_LIST"),ERROR_CHAT_COLOR);
      }
      _loc2_ = 0;
      while(_loc2_ < _loc1_.length)
      {
         _loc3_ = " - " + _loc1_[_loc2_].account;
         if(_loc1_[_loc2_].state != "DISCONNECT")
         {
            _loc3_ += " (" + _loc1_[_loc2_].name + ") " + getText("LEVEL") + ":" + _loc1_[_loc2_].level + ", " + getText(_loc1_[_loc2_].state);
         }
         KERNEL.traceToChat(_loc3_,INFO_CHAT_COLOR);
         _loc2_ = _loc2_ + 1;
      }
   }
};
AKS.Account.onRemoveFriend = function(success, data)
{
   if(success)
   {
      KERNEL.traceToChat(getText("REMOVE_FRIEND_OK"),INFO_CHAT_COLOR);
      AKS.Account.getFriendsList();
   }
   else if(data === "f")
   {
      KERNEL.traceToChat(getText("CANT_ADD_FRIEND_NOT_FOUND"),ERROR_CHAT_COLOR);
   }
};
AKS.Account.onFirendIn = function(data)
{
   if(AKS.Account.output._name != undefined)
   {
      this.getFriendsList();
   }
   var _loc1_ = data.split(";");
   KERNEL.traceToChat(getText("ENTER_DOFUS",[_loc1_[0],_loc1_[1]]),INFO_CHAT_COLOR);
};
AKS.Account.onFirendOut = function(data)
{
   if(AKS.Account.output._name != undefined)
   {
      this.getFriendsList();
   }
   var _loc1_ = data.split(";");
   KERNEL.traceToChat(getText("LEAVE_DOFUS",[_loc1_[0],_loc1_[1]]),INFO_CHAT_COLOR);
};
AKS.Account.onFirendsListForRandomGame = function(fArray)
{
   AKS.Game.output.onFriendsList(fArray);
};
AKS.Account.onNewLevel = function(level)
{
   INTERFACE.Text.setTextTimer("vous passez niveau " + level,2000);
};
AKS.Account.onAddCharacter = function(success)
{
   if(!success)
   {
      INTERFACE.msgBox("Ce nom existe déjà");
   }
};
