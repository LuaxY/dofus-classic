AKS.Infos.onPlayerCount = function(count)
{
   KERNEL.traceToChat(getText("PLAYER_CONNECTED",[count]),INFO_CHAT_COLOR);
};
AKS.Infos.onPodium = function(playersObject)
{
   var _loc3_ = playersObject.length;
   var _loc1_;
   var _loc2_;
   _loc1_ = 0;
   while(_loc1_ < _loc3_)
   {
      _loc2_ = playersObject[_loc1_];
      AKS.Infos.output.podium.buildCharacter(_loc1_,_loc2_);
      _loc1_ = _loc1_ + 1;
   }
};
AKS.Infos.onGeneral = function(playerCount, gameCountSolo, gameCountFree, gameCountRandom, waitingCount)
{
   AKS.Infos.output.GeneralStats.setValues(playerCount,gameCountSolo,gameCountFree,gameCountRandom,waitingCount);
};
