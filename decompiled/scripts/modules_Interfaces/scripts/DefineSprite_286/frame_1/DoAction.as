this.onFocus = function()
{
   var _loc1_ = this;
   AKS.Game.output = _loc1_;
   _loc1_.teamMateCount = 0;
   _loc1_.teamMateIndex = 0;
   _loc1_.teamMateArray = new Array();
   _loc1_.players.removeMovieClip();
   _loc1_.createEmptyMovieClip("players",10);
   _loc1_.teamMateChoose.clear();
   trace(DATACENTER.Game);
   for(k in DATACENTER)
   {
      trace(k);
   }
   if(!DATACENTER.Game.isRandom)
   {
      AKS.Game.createRandom();
      AKS.Account.getFriendsListForRandomGame();
   }
   _loc1_.maskSearch._visible = false;
};
this.onFriendsList = function(fArray)
{
   this.teamMateChoose.update(fArray);
};
this.onNewCharacter = function(name, id, bInvite)
{
   var _loc1_ = this;
   trace("on ajoute " + id + " " + _loc1_.teamMateCount);
   if(bInvite)
   {
      _loc1_.teamMateArray.push(_loc1_.players.attachMovie("TabPlayDofus_TeamMateWaiting","teamMate" + id,_loc1_.teamMateIndex * 10,{_x:13 + _loc1_.teamMateCount * 133,teamMateName:name,index:_loc1_.teamMateIndex,id:id}));
      AKS.Game.invite(id);
   }
   else
   {
      _loc1_.teamMateArray.push(_loc1_.players.attachMovie("TabPlayDofus_TeamMate","teamMate" + id,_loc1_.teamMateIndex * 10,{_x:13 + _loc1_.teamMateCount * 133,teamMateName:name,index:_loc1_.teamMateIndex,id:id}));
   }
   _loc1_.teamMateCount = _loc1_.teamMateCount + 1;
   _loc1_.teamMateindex = _loc1_.teamMateindex + 1;
};
this.onRemoveCharacter = function(characID)
{
   var _loc2_ = this;
   trace("on remove " + characID + "   " + _loc2_.teamMateCount);
   var id = Number(characID);
   _loc2_.teamMateCount = _loc2_.teamMateCount - 1;
   var _loc3_ = false;
   var removeIndex = 0;
   var index;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.teamMateArray.length)
   {
      if(_loc2_.teamMateArray[_loc1_].id == id && !_loc3_)
      {
         _loc2_.teamMateArray[_loc1_].removeMovieClip();
         _loc3_ = true;
         removeIndex = _loc1_;
         index = _loc2_.teamMateArray[_loc1_].index;
      }
      else if(_loc3_)
      {
         _loc2_.teamMateArray[_loc1_].move(false);
      }
      _loc1_ = _loc1_ + 1;
   }
   _loc2_.teamMateArray.splice(removeIndex,1);
   AKS.Account.getFriendsListForRandomGame();
};
this.onValidateInvitation = function(characID)
{
   var _loc2_ = this;
   var id = characID;
   var name = DATACENTER.Chracters.getItemAt(id).name;
   var bFind = false;
   var _loc1_ = 0;
   var _loc3_;
   while(_loc1_ < _loc2_.teamMateArray.length)
   {
      if(_loc2_.teamMateArray[_loc1_].bWaitingCmp)
      {
         if(_loc2_.teamMateArray[_loc1_].id == id)
         {
            bFind = true;
            _loc3_ = _loc2_.teamMateArray[_loc1_].index;
            var x = _loc2_.teamMateArray[_loc1_]._x;
            _loc2_.teamMateArray[_loc1_].removeMovieClip();
            _loc2_.teamMateArray[_loc1_] = _loc2_.players.attachMovie("TabPlayDofus_TeamMate","teamMate" + _loc3_,_loc3_ * 10,{_x:x,teamMateName:name,id:id});
            break;
         }
      }
      _loc1_ = _loc1_ + 1;
   }
   if(!bFind)
   {
      _loc2_.onNewCharacter(name,id,false);
   }
};
