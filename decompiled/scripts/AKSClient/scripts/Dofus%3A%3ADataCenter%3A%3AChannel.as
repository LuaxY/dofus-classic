Class_DataCenter_Channel = function()
{
   this.m_name = null;
   this.m_lastChannel = null;
};
Object.registerClass("Dofus::DataCenter::Channel",Class_DataCenter_Channel);
Class_DataCenter_Channel.prototype.addProperty("name",function()
{
   return this.m_name;
}
,function()
{
   this.m_lastChannel = this.m_name;
}
);
Class_DataCenter_Channel.prototype.addProperty("lastChannel",function()
{
   return this.m_lastChannel;
}
,null);
ASSetPropFlags(Class_DataCenter_Channel.prototype,null,1,1);
