Class_DataCenter_Player = function(login, password)
{
   var _loc1_ = this;
   ASBroadcaster.initialize(_loc1_);
   _loc1_.login = login;
   _loc1_.password = password;
   _loc1_.ID = null;
   _loc1_.name = null;
   _loc1_.Language = null;
   _loc1_.Inventory = new Array();
   _loc1_.Spells = new DofusDataProviderClass();
   _loc1_.SpellsObjects = new DofusDataProviderClass();
   _loc1_.SpellsUsed = new DofusDataProviderClass();
   _loc1_.SpellsAir = new Array();
   _loc1_.SpellsWater = new Array();
   _loc1_.SpellsEarth = new Array();
   _loc1_.SpellsFire = new Array();
   _loc1_.SpellsGuild = new Array();
   _loc1_.CCData = new Object();
   _loc1_.Friends = new Array();
   _loc1_.currentSpell = null;
   _loc1_.bWinner = false;
   _loc1_.lastClickedCell = null;
   _loc1_.tmpFullPath = new Array();
   _loc1_.tmpPath = new Array();
   _loc1_.SpellsManager = new Class_SpellsManager(_loc1_);
};
Object.registerClass("Dofus::DataCenter::Player",Class_DataCenter_Player);
Class_DataCenter_Player.prototype.addProperty("clip",function()
{
   return DATACENTER.Characters.getItemAt(this.ID).clip;
}
,null);
Class_DataCenter_Player.prototype.addProperty("data",function()
{
   return DATACENTER.Characters.getItemAt(this.ID);
}
,null);
Class_DataCenter_Player.prototype.addProperty("isCurrentPlayer",function()
{
   return DATACENTER.Game.currentPlayerID == this.ID;
}
,null);
Class_DataCenter_Player.prototype.addProperty("noMoreAP",function()
{
   return this.data.AP <= 0;
}
,null);
Class_DataCenter_Player.prototype.reset = function()
{
   var _loc1_ = this;
   _loc1_.currentSpell = null;
   _loc1_.lastClickedCell = null;
   _loc1_.tmpFullPath = new Array();
   _loc1_.tmpPath = new Array();
   _loc1_.data.bDied = false;
};
Class_DataCenter_Player.prototype.clearTmpPaths = function()
{
   this.tmpFullPath = new Array();
   this.tmpPath = new Array();
};
Class_DataCenter_Player.prototype.hasEnoughAP = function(wantedAP)
{
   return this.data.AP >= wantedAP;
};
Class_DataCenter_Player.prototype.setCCData = function(APCost)
{
   var _loc1_ = this;
   _loc1_.CCData = new Object();
   _loc1_.CCData.m_APCost = APCost;
   _loc1_.CCData.m_Description = getCCText(_loc1_.guild);
   _loc1_.CCData.m_bOnItSelf = false;
   _loc1_.CCData.iconFile = CLIPS_PATH + "ccicon.swf";
};
Class_DataCenter_Player.prototype.addItem = function(itemData)
{
   this.Inventory.push(itemData);
   this.broadcastMessage("onInventoryChange");
};
Class_DataCenter_Player.prototype.dropItem = function(itemNum)
{
   var _loc2_ = this;
   var _loc3_ = _loc2_.Inventory.length;
   var _loc1_;
   _loc1_ = 0;
   while(_loc1_ < _loc3_)
   {
      if(_loc2_.Inventory[_loc1_].m_ID == Number(itemNum))
      {
         _loc2_.Inventory.splice(_loc1_,1);
         break;
      }
      _loc1_ = _loc1_ + 1;
   }
   _loc2_.broadcastMessage("onInventoryChange");
};
Class_DataCenter_Player.prototype.addSpell = function(spellObject)
{
   var _loc3_ = spellObject;
   var _loc2_;
   var strDest = new String();
   switch(_loc3_.m_type)
   {
      case "A":
         strDest = "Air";
         break;
      case "W":
         strDest = "Water";
         break;
      case "E":
         strDest = "Earth";
         break;
      case "F":
         strDest = "Fire";
   }
   if(_loc3_.m_bGuildSpell)
   {
      strDest = "Guild";
   }
   _loc2_ = this["Spells" + strDest];
   var bExist = false;
   var i;
   var oldPos;
   var _loc1_;
   _loc1_ = 0;
   while(_loc1_ < _loc2_.length)
   {
      if(_loc2_[_loc1_].m_ID == _loc3_.m_ID)
      {
         oldPos = _loc2_[_loc1_].m_Position;
         _loc3_.m_Position = oldPos;
         _loc2_[_loc1_] = _loc3_;
         i = _loc1_;
         bExist = true;
         break;
      }
      _loc1_ = _loc1_ + 1;
   }
   this.Spells.setItemAt(_loc3_.m_ID,_loc3_);
   if(!bExist)
   {
      i = _loc2_.push(_loc3_);
   }
   if(!isNaN(_loc3_.m_Position))
   {
      this.SpellsUsed.setItemAt(_loc3_.m_Position,_loc3_);
   }
   return {index:i,location:strDest};
};
Class_DataCenter_Player.prototype.canBoost = function(value)
{
   if(DATACENTER.Game.IsRunning)
   {
      return false;
   }
   if(this.data.bonusPoints >= value)
   {
      return true;
   }
   return false;
};
ASSetPropFlags(Class_DataCenter_Player.prototype,null,1,1);
