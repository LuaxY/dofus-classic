Class_DataCenter_Game = function()
{
   var _loc1_ = this;
   _loc1_.m_bRunning = false;
   _loc1_.m_name = null;
   _loc1_.m_playerCount = null;
   _loc1_.m_maxPlayerCount = null;
   _loc1_.currentPlayerID = null;
   _loc1_.lastPlayerID = null;
   _loc1_.state = null;
   _loc1_.turnSequence = new Array();
   _loc1_.Results = new Object();
   _loc1_.bYouAreCreator = false;
   _loc1_.bInSearch = false;
   _loc1_.players = new DofusDataProviderClass();
};
Object.registerClass("Dofus::DataCenter::Game",Class_DataCenter_Game);
Class_DataCenter_Game.prototype.addProperty("isPlayerIn",function()
{
   return this.state != null;
}
,null);
Class_DataCenter_Game.prototype.addProperty("isRunning",function()
{
   return this.m_bRunning;
}
,null);
Class_DataCenter_Game.prototype.addProperty("name",function()
{
   return this.m_name;
}
,null);
Class_DataCenter_Game.prototype.addProperty("isFull",function()
{
   return this.m_playerCount >= this.m_maxPlayerCount;
}
,null);
Class_DataCenter_Game.prototype.addProperty("isMultiplayer",function()
{
   return this.state > 1 && this.state != null;
}
,null);
Class_DataCenter_Game.prototype.addProperty("isFree",function()
{
   return this.state == 2;
}
,null);
Class_DataCenter_Game.prototype.addProperty("isRandom",function()
{
   return this.state == 3;
}
,null);
Class_DataCenter_Game.prototype.addProperty("isFight",function()
{
   return this.state > 1 && this.state != null;
}
,null);
ASSetPropFlags(Class_DataCenter_Game.prototype,null,1,1);
