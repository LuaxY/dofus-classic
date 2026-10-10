Class_SpellsManager = function(playerData)
{
   this.playerData = playerData;
   this.init();
};
Object.registerClass("Dofus::SpellsManager",Class_SpellsManager);
Class_SpellsManager.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.SpellsCountByTurn = new Array();
   _loc1_.SpellsCountByTurn_Counter = new Object();
   _loc1_.SpellsCountByPlayer = new Array();
   _loc1_.SpellsCountByPlayer_Counter = new Object();
   _loc1_.SpellsDelay = new Array();
};
Class_SpellsManager.prototype.addLaunchedSpell = function(spellLaunchData)
{
   var _loc1_ = spellLaunchData;
   var _loc2_ = this;
   var _loc3_ = _loc1_.m_spellData;
   var launchCountByTurn = _loc3_.m_LaunchCountByTurn;
   var launchCountByPlayerTurn = _loc3_.m_LaunchCountByPlayerTurn;
   var delayBetweenLaunch = _loc3_.m_DelayBetweenLaunch;
   if(launchCountByTurn != 0)
   {
      _loc2_.SpellsCountByTurn.push(_loc1_);
      _loc2_.SpellsCountByTurn_Counter[_loc1_.m_SpellID]++;
   }
   if(launchCountByPlayerTurn != 0)
   {
      if(_loc1_.m_characOnID != undefined)
      {
         _loc2_.SpellsCountByPlayer.push(_loc1_);
         _loc2_.SpellsCountByPlayer_Counter[_loc1_.m_SpellID]++;
      }
   }
   if(delayBetweenLaunch != 0)
   {
      _loc2_.SpellsDelay.push(_loc1_);
   }
};
Class_SpellsManager.prototype.nextTurn = function()
{
   var _loc3_ = this;
   var len;
   var _loc1_;
   var _loc2_;
   _loc3_.SpellsCountByTurn = new Array();
   _loc3_.SpellsCountByTurn_Counter = new Object();
   _loc3_.SpellsCountByPlayer = new Array();
   _loc3_.SpellsCountByPlayer_Counter = new Object();
   len = _loc3_.SpellsDelay.length;
   _loc1_ = 0;
   while(_loc1_ < len)
   {
      _loc2_ = _loc3_.SpellsDelay[_loc1_];
      _loc2_.m_RemainingTurn = _loc2_.m_RemainingTurn - 1;
      if(_loc2_.m_RemainingTurn <= 0)
      {
         _loc3_.SpellsDelay.splice(_loc1_,_loc1_ + 1);
      }
      _loc1_ = _loc1_ + 1;
   }
};
Class_SpellsManager.prototype.checkCanLaunchSpell = function(spellID, characID)
{
   var _loc3_ = this;
   var _loc1_;
   var len;
   var _loc2_;
   var spellData;
   var launchCountByTurn;
   var launchCountByPlayerTurn;
   len = _loc3_.SpellsCountByTurn.length;
   _loc1_ = 0;
   while(_loc1_ < len)
   {
      _loc2_ = _loc3_.SpellsCountByTurn[_loc1_];
      if(_loc2_.m_SpellID == spellID)
      {
         spellData = _loc2_.m_spellData;
         launchCountByTurn = spellData.m_LaunchCountByTurn;
         if(_loc3_.SpellsCountByTurn_Counter[spellID] >= launchCountByTurn)
         {
            BATTLEFIELD.Interaction.errorMessage = getText("CANT_LAUNCH_MORE",[launchCountByTurn]);
            return false;
         }
      }
      _loc1_ = _loc1_ + 1;
   }
   len = _loc3_.SpellsCountByPlayer.length;
   _loc1_ = 0;
   while(_loc1_ < len)
   {
      _loc2_ = _loc3_.SpellsCountByPlayer[_loc1_];
      if(_loc2_.m_SpellID == spellID)
      {
         spellData = _loc2_.m_spellData;
         launchCountByPlayerTurn = spellData.m_LaunchCountByPlayerTurn;
         if(_loc2_.m_characOnID == characID && _loc3_.SpellsCountByPlayer_Counter[spellID] >= launchCountByPlayerTurn)
         {
            BATTLEFIELD.Interaction.errorMessage = getText("CANT_ON_THIS_PLAYER");
            return false;
         }
      }
      _loc1_ = _loc1_ + 1;
   }
   len = _loc3_.SpellsDelay.length;
   _loc1_ = 0;
   while(_loc1_ < len)
   {
      _loc2_ = _loc3_.SpellsDelay[_loc1_];
      if(_loc2_.m_SpellID == spellID)
      {
         if(_loc2_.m_RemainingTurn >= 63)
         {
            BATTLEFIELD.Interaction.errorMessage = getText("CANT_RELAUNCH");
         }
         else
         {
            BATTLEFIELD.Interaction.errorMessage = getText("CANT_LAUNCH_BEFORE",[_loc2_.m_RemainingTurn]);
         }
         return false;
      }
      _loc1_ = _loc1_ + 1;
   }
   return true;
};
Class_SpellsManager.prototype.initSpellLaunchData = function(spellLaunchData)
{
   var _loc2_ = this;
   var _loc1_ = playerData.data;
   switch(spellLaunchData.m_Type)
   {
      case _loc2_.ACTION_POINT:
         _loc1_.updateInitAP(- effect.m_Value);
         break;
      case _loc2_.LIFE_POINT:
         _loc1_.updateInitLP(- effect.m_Value);
         break;
      case _loc2_.RANGE:
         _loc1_.updateRange(- effect.m_Value);
         break;
      case _loc2_.CRITICAL_HIT:
         _loc1_.updateCriticalHit(- effect.m_Value);
      default:
         return;
   }
};
