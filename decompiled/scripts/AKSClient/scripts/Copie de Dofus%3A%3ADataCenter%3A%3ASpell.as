Class_DataCenter_Spell = function()
{
   var _loc1_ = this;
   _loc1_.m_ID = null;
   _loc1_.m_Level = null;
   _loc1_.m_EffectZones = null;
   _loc1_.m_bGuildSpell = null;
   _loc1_.m_Type = null;
   _loc1_.m_EffectType = null;
   _loc1_.m_bOnItSelf = null;
   _loc1_.m_bLineOnly = null;
   _loc1_.m_Range = null;
   _loc1_.m_APCost = null;
   _loc1_.m_bLineOfSight = null;
   _loc1_.m_bFreeCell = null;
   _loc1_.m_CriticalHit = null;
   _loc1_.m_Criticalfailure = null;
   _loc1_.m_LaunchCountByTurn = null;
   _loc1_.m_LaunchCountByPlayerTurn = null;
   _loc1_.m_DelayBetweenLaunch = null;
   _loc1_.m_Position = null;
   _loc1_.m_AnimID = null;
   _loc1_.m_bInFrontOfPlayer = null;
};
Object.registerClass("Dofus::DataCenter::Spell",Class_DataCenter_Spell);
Class_DataCenter_Spell.prototype.setEffectZones = function(compressedData)
{
   var _loc2_ = compressedData.split("");
   var tmpArray2 = new Array();
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.length)
   {
      tmpArray2.push({shape:_loc2_[_loc1_],size:KERNEL.Compressor.decode64(_loc2_[_loc1_ + 1])});
      _loc1_ += 2;
   }
   this.m_EffectZones = tmpArray2;
};
Class_DataCenter_Spell.prototype.setAdditionalData = function(compressedData)
{
   var _loc1_ = this;
   var _loc2_ = compressedData.split("");
   _loc1_.m_bGuildSpell = _loc2_[0] != "1" ? false : true;
   _loc1_.m_Type = _loc2_[1];
   _loc1_.m_EffectType = _loc2_[2];
   _loc1_.m_bOnItSelf = _loc2_[3] != "1" ? false : true;
   _loc1_.m_bLineOnly = _loc2_[4] != "1" ? false : true;
   _loc1_.m_Range = KERNEL.Compressor.decode64(_loc2_[5]);
   _loc1_.m_APCost = KERNEL.Compressor.decode64(_loc2_[6]);
   _loc1_.m_bLineOfSight = _loc2_[7] != "1" ? false : true;
   _loc1_.m_bFreeCell = _loc2_[8] != "1" ? false : true;
   _loc1_.m_CriticalHit = KERNEL.Compressor.decode64(_loc2_[9]);
   _loc1_.m_Criticalfailure = KERNEL.Compressor.decode64(_loc2_[10]);
   _loc1_.m_LaunchCountByTurn = KERNEL.Compressor.decode64(_loc2_[11]);
   _loc1_.m_LaunchCountByPlayerTurn = KERNEL.Compressor.decode64(_loc2_[12]);
   _loc1_.m_DelayBetweenLaunch = KERNEL.Compressor.decode64(_loc2_[13]);
   _loc1_.m_Position = KERNEL.Compressor.decode64(_loc2_[14]);
   if(_loc1_.m_Position > 8 || _loc1_.m_Position < 1)
   {
      _loc1_.m_Position = null;
   }
};
Class_DataCenter_Spell.prototype.addProperty("data",function()
{
   var _loc1_ = this;
   return {name:_loc1_.m_name,file:_loc1_.m_file,type:_loc1_.m_type,infos:_loc1_.m_infos,effects:_loc1_.m_effects};
}
,null);
Class_DataCenter_Spell.prototype.addProperty("iconFile",function()
{
   return SPELLS_PATH + "icons/" + this.m_ID + ".swf";
}
,null);
Class_DataCenter_Spell.prototype.addProperty("file",function()
{
   return SPELLS_PATH + this.m_AnimID + ".swf";
}
,null);
Class_DataCenter_Spell.prototype.addProperty("m_Name",function()
{
   return getSpellText(this.m_ID).n;
}
,null);
Class_DataCenter_Spell.prototype.addProperty("m_Description",function()
{
   return getSpellText(this.m_ID).d;
}
,null);
Class_DataCenter_Spell.prototype.addProperty("m_DescriptionNormalHit",function()
{
   return getSpellText(this.m_ID)["l" + this.m_Level][0];
}
,null);
Class_DataCenter_Spell.prototype.addProperty("m_DescriptionCriticalHit",function()
{
   return getSpellText(this.m_ID)["l" + this.m_Level][1];
}
,null);
Class_DataCenter_Spell.prototype.addProperty("m_DescriptionCriticalHit",function()
{
   return getSpellText(this.m_ID)["l" + this.m_Level][1];
}
,null);
ASSetPropFlags(Class_DataCenter_Spell.prototype,null,1,1);
