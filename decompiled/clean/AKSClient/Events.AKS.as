AKS.onConnect = function(success, msg)
{
   if(success)
   {
      AKS.logon(DATACENTER.Player.login,DATACENTER.Player.password);
   }
   else
   {
      if(INTERFACE.CommonLayer_mc.loginInterface == undefined)
      {
         INTERFACE.drawLoginInterface();
      }
      SOMA.onError();
      INTERFACE.msgBox(msg);
   }
};
AKS.onDisconnect = function(bRelog)
{
   var _loc1_;
   if(isLogged)
   {
      _loc1_ = getText("DISCONNECT");
      if(AKS.m_ServerMessageID != -1)
      {
         _loc1_ += "\r\r" + getText("SRV_MSG_" + AKS.m_ServerMessageID);
         AKS.m_ServerMessageID = -1;
      }
      if(!bRelog)
      {
         INTERFACE.msgBox(_loc1_);
      }
      AKS.clear();
      INTERFACE.clear();
      BATTLEFIELD.clear();
      DATACENTER.clear();
      if(!bRelog)
      {
         INTERFACE.drawLoginInterface();
      }
   }
   isLogged = false;
};
AKS.onLogin = function(success, msg, language)
{
   if(success)
   {
      INTERFACE.clear();
      DATACENTER.Player.Language = language;
      if(AKS.m_bSkipMenu)
      {
         AKS.Account.getCharacters();
      }
      else
      {
         INTERFACE.drawMenuInterface();
      }
      isLogged = true;
      AKS.m_bSkipMenu = false;
   }
   else
   {
      if(INTERFACE.CommonLayer_mc.loginInterface == undefined)
      {
         INTERFACE.drawLoginInterface();
      }
      SOMA.onError();
      INTERFACE.msgBox(msg);
   }
};
AKS.onServerMessage = function(display, messageID)
{
   if(display == "1")
   {
      INTERFACE.msgBox(getText("SRV_MSG_" + messageID,[]));
      AKS.m_ServerMessageID = -1;
   }
};
AKS.onBadVersion = function()
{
   var _loc2_ = _root;
   var _loc1_ = _loc2_._url;
   _loc1_ = _loc1_.replace("%5C","/");
   _loc1_ = _loc1_.replace("\\","/");
   _loc1_ = _loc1_.replace("file:///","");
   _loc1_ = _loc1_.replace("file://","");
   var _loc3_ = _loc1_.lastIndexOf("/");
   _loc1_ = _loc1_.substring(0,_loc3_ + 1);
   _loc2_.createEmptyMovieClip("pathData",12345);
   _loc2_.pathData.path = _loc1_ + "DOFUS.swf";
   System.security.allowDomain(SITE_PATH);
   _loc2_.pathData.loadVariables(HTTP_LOGIN_PATH + "delpath.php","POST");
};
