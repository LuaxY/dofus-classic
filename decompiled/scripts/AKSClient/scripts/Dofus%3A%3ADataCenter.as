Class_DataCenter = function()
{
   _global.DATACENTER = this;
   this.init();
};
Class_DataCenter.prototype = new MovieClip();
Object.registerClass("Dofus::DataCenter",Class_DataCenter);
Class_DataCenter.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.Player = new Class_DataCenter_Player();
   _loc1_.Clips = new DofusDataProviderClass();
   _loc1_.Game = new Class_DataCenter_Game();
   _loc1_.Channel = new Class_DataCenter_Channel();
   _loc1_.Characters = new DofusDataProviderClass();
   _loc1_.Map = new DofusDataProviderClass();
   _loc1_.Objects = new DofusDataProviderClass();
   _loc1_.Spells = new DofusDataProviderClass();
};
Class_DataCenter.prototype.clear = function()
{
   var _loc1_ = this;
   _loc1_.Player = new Class_DataCenter_Player(DATACENTER.Player.login,DATACENTER.Player.password);
   _loc1_.Clips = new DofusDataProviderClass();
   _loc1_.Game = new Class_DataCenter_Game();
   _loc1_.Channel = new Class_DataCenter_Channel();
   _loc1_.Characters = new DofusDataProviderClass();
   _loc1_.Map = new DofusDataProviderClass();
   _loc1_.Objects = new DofusDataProviderClass();
   _loc1_.Spells = new DofusDataProviderClass();
};
ASSetPropFlags(Class_DataCenter.prototype,null,1,1);
