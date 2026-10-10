AKS.Spells.onMovement = function(bAdd, spellData)
{
   var _loc2_ = INTERFACE.InterfaceBanner.panels.Spells;
   var _loc1_;
   if(bAdd)
   {
      _loc1_ = DATACENTER.Player.addSpell(spellData);
      _loc2_["tab" + _loc1_.location]["s" + _loc1_.index].container.setItem(spellData);
   }
};
AKS.Spells.onUpgradeSpell = function()
{
   INTERFACE.UIInterfaceBanner.updateSpells();
};
AKS.Spells.onInfos = function(spellData)
{
   var _loc3_ = spellData;
   var _loc1_ = AKS.Spells.output;
   _loc1_.btnBoost.setLabel(getText("LEVEL") + " " + _loc3_.m_Level);
   _loc1_.txtCost.setText(getText("COST") + " : " + SPELL_BOOST_BONUS[_loc3_.m_Level - 1],"Font1");
   var _loc2_ = _loc1_.sBoost.container.getData();
   _loc1_.BoostInfos_mc._y = -258.7;
   _loc1_.BoostInfos_mc.setSpellInfos(_loc2_,_loc3_);
};
