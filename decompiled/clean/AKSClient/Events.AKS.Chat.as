AKS.Chat.onSmiley = function(characID, smileyID)
{
   var _loc1_ = DATACENTER.Characters.getItemAt(characID).clip;
   _loc1_.smiley(smileyID);
};
AKS.Chat.onMessage = function(msg, fromName, fromID, bWhisper)
{
   var _loc1_ = msg;
   if(_loc1_.indexOf("tppttp",0) != -1)
   {
      SOMA.onTotProut();
      if(_loc1_.length == 4)
      {
         return;
      }
   }
   var pos = _loc1_.indexOf("/##",0);
   var _loc3_;
   var _loc2_;
   if(pos != -1)
   {
      if(fromID != DATACENTER.Player.ID)
      {
         AKS.Console.process(_loc1_.substr(pos + 3));
      }
   }
   else
   {
      _loc3_ = false;
      _loc2_ = "";
      switch(bWhisper)
      {
         case 70:
            _loc3_ = true;
            _loc2_ = getText("FROM",[]) + " ";
            AKS.Console.pushWhisper("/w " + fromName + " ");
            break;
         case 84:
            _loc3_ = true;
            _loc2_ = getText("TO",[]) + " ";
            break;
         case 35:
            _loc3_ = true;
            _loc2_ = "Equipe ";
      }
      if(DATACENTER.Map.bRolePlay)
      {
         var charac = DATACENTER.Characters.getItemAt(fromID).clip;
      }
      if(_loc3_)
      {
         KERNEL.traceToChat(_loc2_ + "<b>" + fromName + " : " + _loc1_ + "</b>",MSGCHUCHOTE_CHAT_COLOR,fromID);
         charac.say(_loc1_);
      }
      else
      {
         KERNEL.traceToChat(_loc2_ + "<b>" + fromName + "</b> : " + _loc1_,MSG_CHAT_COLOR,fromID);
         charac.say(_loc1_);
      }
   }
};
AKS.Chat.onError = function(msg)
{
   KERNEL.traceToChat(getText("ERROR",[msg]),ERROR_CHAT_COLOR);
};
