Class_DataCenter_Effect = function()
{
   var _loc1_ = this;
   _loc1_.m_Type = null;
   _loc1_.m_Value = null;
   _loc1_.m_RemainingTurn = null;
};
Object.registerClass("Dofus::DataCenter::Effect",Class_DataCenter_Effect);
Class_DataCenter_Spell.prototype.addProperty("type",function()
{
   return this.m_Type;
}
,function(value)
{
   this.m_Type = Number(value);
}
);
Class_DataCenter_Spell.prototype.addProperty("value",function()
{
   return this.m_Value;
}
,function(value)
{
   this.m_Value = Number(value);
}
);
Class_DataCenter_Spell.prototype.addProperty("remainingTurn",function()
{
   return this.m_RemainingTurn;
}
,function(value)
{
   this.m_RemainingTurn = Number(value);
}
);
ASSetPropFlags(Class_DataCenter_Effect.prototype,null,1,1);
