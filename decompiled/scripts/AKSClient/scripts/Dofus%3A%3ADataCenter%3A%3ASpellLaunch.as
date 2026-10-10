Class_DataCenter_SpellLaunch = function(spellID, characOnID)
{
   var _loc1_ = this;
   _loc1_.m_SpellID = spellID;
   _loc1_.m_PlayerData = DATACENTER.Player;
   _loc1_.m_spellData = null;
   _loc1_.m_RemainingTurn = null;
   _loc1_.m_characOnID = characOnID;
   _loc1_.init();
};
Object.registerClass("Dofus::DataCenter::SpellLaunch",Class_DataCenter_SpellLaunch);
Class_DataCenter_SpellLaunch.prototype.init = function()
{
   var _loc2_ = this;
   _loc2_.m_spellData = _loc2_.m_PlayerData.Spells.getItemAt(_loc2_.m_SpellID);
   var _loc1_ = _loc2_.m_spellData.m_DelayBetweenLaunch;
   if(_loc1_ == undefined)
   {
      _loc1_ = 0;
   }
   if(_loc1_ >= 63)
   {
      _loc2_.m_RemainingTurn = 1.7976931348623157e+308;
   }
   else
   {
      _loc2_.m_RemainingTurn = _loc1_;
   }
};
ASSetPropFlags(Class_DataCenter_SpellLaunch.prototype,null,1,1);
