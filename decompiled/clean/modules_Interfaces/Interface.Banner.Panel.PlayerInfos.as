Class_InterfaceBannerPanelPlayerInfos = function()
{
   this.init();
};
Class_InterfaceBannerPanelPlayerInfos.prototype = new MovieClip();
Object.registerClass("Interface::Banner::Panel::PlayerInfos",Class_InterfaceBannerPanelPlayerInfos);
Class_InterfaceBannerPanelPlayerInfos.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.txtXP.setText(getText("EXPERIMENT"),"Font2");
   _loc1_.txtCharacteristics.setText(getText("CHARACTERISTICS"),"Font2");
   _loc1_.txtLP.setText(getText("LIFEPOINTS"),"Font2");
   _loc1_.txtAP.setText(getText("ACTIONPOINTS"),"Font2");
   var _loc2_ = _loc1_.attachMovie("Interface::ProgressBar","XPProgressbar",10);
   _loc2_.init(_loc1_.progressBarGuid_mc._width,_loc1_.progressBarGuid_mc._height,_loc1_.progressBarGuid_mc._width / 2 + _loc1_.progressBarGuid_mc._x,_loc1_.progressBarGuid_mc._y);
};
Class_InterfaceBannerPanelPlayerInfos.prototype.setParams = function(params)
{
   this.setData(params);
};
Class_InterfaceBannerPanelPlayerInfos.prototype.setData = function(data)
{
   var _loc3_ = this;
   _loc3_._data = data;
   _loc3_.txtTitle.setText(_loc3_._data.name,"Font2");
   _loc3_.onSetLevel(_loc3_._data.level);
   _loc3_.onSetXP(_loc3_._data.XP);
   _loc3_.onSetLP(_loc3_._data.LP);
   _loc3_.onSetAP(_loc3_._data.AP);
   var _loc2_;
   var effects = _loc3_._data.getEffects();
   var _loc1_;
   var len = effects.length;
   _loc3_.effects_lst.removeAll();
   if(len == 0)
   {
      _loc3_.effects_lst.addItem("Aucun effets");
   }
   _loc2_ = 0;
   while(_loc2_ < len)
   {
      _loc1_ = effects[_loc2_];
      _loc3_.effects_lst.addItem("t:" + _loc1_.type + " v:" + _loc1_.value + " r:" + _loc1_.remainingTurn);
      _loc2_ = _loc2_ + 1;
   }
   INTERFACE.addToListner(_loc3_);
   _loc3_._data.addListener(_loc3_);
};
Class_InterfaceBannerPanelPlayerInfos.prototype.onSetLevel = function(value)
{
   this.txtLevel.setText(getText("LEVEL") + " " + value,"Font2");
};
Class_InterfaceBannerPanelPlayerInfos.prototype.onSetXP = function(value)
{
   var _loc2_ = value;
   this.txtXPValue.setText(_loc2_,"Font2");
   var _loc1_ = DATACENTER.Player.data;
   var low = _loc1_.XPlow;
   var _loc3_ = _loc1_.XPhigh - _loc1_.XPlow;
   _loc2_ -= low;
   this.XPProgressbar.update(_loc2_,_loc3_);
};
Class_InterfaceBannerPanelPlayerInfos.prototype.onSetLP = function(value)
{
   this.txtLPValue.setText(value,"Font2");
};
Class_InterfaceBannerPanelPlayerInfos.prototype.onSetAP = function(value)
{
   this.txtAPValue.setText(value,"Font2");
};
