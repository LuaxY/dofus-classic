AKS.Channels.onJoin = function(name, success)
{
   DATACENTER.Game = new Class_Datacenter_Game();
   if(!success)
   {
      log("Impossible de joindre le channel <b>" + name + "</b>",true);
      return undefined;
   }
   AKS.Chat.output.clearForNewChat(name);
   this.getList();
};
AKS.Channels.onMovement = function(bAdd, user, newRoom)
{
   var _loc1_ = user;
   if(bAdd)
   {
      AKS.Chat.output.addUser(_loc1_);
      if(!newRoom)
      {
         KERNEL.traceToChat(getText("ENTER_CHANNEL",[_loc1_.name]),INFO_CHAT_COLOR);
      }
   }
   else
   {
      AKS.Chat.output.removeUser(_loc1_);
   }
};
