Class_InterfaceBannerPanelInventory = function()
{
   this.init();
};
Class_InterfaceBannerPanelInventory.prototype = new MovieClip();
Object.registerClass("Interface::Banner::Panel::Inventory",Class_InterfaceBannerPanelInventory);
Class_InterfaceBannerPanelInventory.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.txtXP.setText(getText("EXPERIMENT"),"Font2");
   _loc1_.txtCharacteristics.setText(getText("CHARACTERISTICS"),"Font2");
   _loc1_.txtLP.setText(getText("LIFEPOINTS"),"Font2");
   _loc1_.txtAP.setText(getText("ACTIONPOINTS"),"Font2");
   _loc1_.txtResistances.setText(getText("RESISTANCES"),"Font2");
   _loc1_.txtFire.setText(getText("FIRE"),"Font1");
   _loc1_.txtAir.setText(getText("AIR"),"Font1");
   _loc1_.txtWater.setText(getText("WATER"),"Font1");
   _loc1_.txtEarth.setText(getText("EARTH"),"Font1");
   _loc1_.txtForce.setText(getText("FORCE"),"Font1");
   _loc1_.txtVitality.setText(getText("VITALITY"),"Font1");
   _loc1_.txtCharism.setText(getText("CHARISM"),"Font1");
   _loc1_.txtKarma.setText(getText("KARMA"),"Font1");
   _loc1_.txtAgility.setText(getText("AGILITY"),"Font1");
   _loc1_.txtIntelligence.setText(getText("INTELLIGENCE"),"Font1");
   _loc1_.txtBonus.setText(getText("BONUS"),"Font2");
   var _loc2_ = _loc1_.attachMovie("Interface::ProgressBar","XPProgressbar",10);
   _loc2_.init(_loc1_.progressBarGuid_mc._width,_loc1_.progressBarGuid_mc._height,_loc1_.progressBarGuid_mc._width / 2 + _loc1_.progressBarGuid_mc._x,_loc1_.progressBarGuid_mc._y);
   _loc1_.txtTitle.setText(DATACENTER.Player.name,"Font2");
   _loc1_.onSetLevel(DATACENTER.Player.data.level);
   _loc1_.onSetGP(DATACENTER.Player.data.GP);
   _loc1_.onSetXP(DATACENTER.Player.data.XP);
   _loc1_.onSetLP(DATACENTER.Player.data.LP);
   _loc1_.onSetAP(DATACENTER.Player.data.AP);
   _loc1_.onSetAir(DATACENTER.Player.data.rAir);
   _loc1_.onSetFire(DATACENTER.Player.data.rFire);
   _loc1_.onSetWater(DATACENTER.Player.data.rWater);
   _loc1_.onSetEarth(DATACENTER.Player.data.rEarth);
   _loc1_.onSetForce(DATACENTER.Player.data.force);
   _loc1_.onSetVitality(DATACENTER.Player.data.vitality);
   _loc1_.onSetCharism(DATACENTER.Player.data.charism);
   _loc1_.onSetKarma(DATACENTER.Player.data.karma);
   _loc1_.onSetAgility(DATACENTER.Player.data.agility);
   _loc1_.onSetIntelligence(DATACENTER.Player.data.intelligence);
   _loc1_.onSetBonus(DATACENTER.Player.data.bonusPoints);
   INTERFACE.addToListner(_loc1_);
   DATACENTER.Player.data.addListener(_loc1_);
};
Class_InterfaceBannerPanelInventory.prototype.onSetLevel = function(value)
{
   this.txtLevel.setText(getText("LEVEL") + " " + value,"Font2");
};
Class_InterfaceBannerPanelInventory.prototype.onSetXP = function(value)
{
   var _loc2_ = value;
   this.txtXPValue.setText(_loc2_,"Font2");
   var _loc1_ = DATACENTER.Player.data;
   var low = _loc1_.XPlow;
   var _loc3_ = _loc1_.XPhigh - _loc1_.XPlow;
   _loc2_ -= low;
   this.XPProgressbar.update(_loc2_,_loc3_);
};
Class_InterfaceBannerPanelInventory.prototype.onSetLP = function(value)
{
   this.txtLPValue.setText(value,"Font2");
};
Class_InterfaceBannerPanelInventory.prototype.onSetAP = function(value)
{
   this.txtAPValue.setText(value,"Font2");
};
Class_InterfaceBannerPanelInventory.prototype.onSetGP = function(value)
{
   this.txtGPValue.setText(value,"Font1");
};
Class_InterfaceBannerPanelInventory.prototype.onSetAir = function(value)
{
   this.txtAirValue.setText(value,"Font1");
   this.btn7._visible = true;
};
Class_InterfaceBannerPanelInventory.prototype.onSetFire = function(value)
{
   this.txtFireValue.setText(value,"Font1");
   this.btn6._visible = true;
};
Class_InterfaceBannerPanelInventory.prototype.onSetWater = function(value)
{
   this.txtWaterValue.setText(value,"Font1");
   this.btn8._visible = true;
};
Class_InterfaceBannerPanelInventory.prototype.onSetEarth = function(value)
{
   this.txtEarthValue.setText(value,"Font1");
   this.btn9._visible = true;
};
Class_InterfaceBannerPanelInventory.prototype.onSetForce = function(value)
{
   this.txtForceValue.setText(value,"Font1");
   this.btn10._visible = true;
};
Class_InterfaceBannerPanelInventory.prototype.onSetVitality = function(value)
{
   this.txtVitalityValue.setText(value,"Font1");
   this.btn11._visible = true;
};
Class_InterfaceBannerPanelInventory.prototype.onSetCharism = function(value)
{
   this.txtCharismValue.setText(value,"Font1");
   this.btn12._visible = true;
};
Class_InterfaceBannerPanelInventory.prototype.onSetKarma = function(value)
{
   this.txtKarmaValue.setText(value,"Font1");
   this.btn13._visible = true;
};
Class_InterfaceBannerPanelInventory.prototype.onSetAgility = function(value)
{
   this.txtAgilityValue.setText(value,"Font1");
   this.btn14._visible = true;
};
Class_InterfaceBannerPanelInventory.prototype.onSetIntelligence = function(value)
{
   this.txtIntelligenceValue.setText(value,"Font1");
   this.btn15._visible = true;
};
Class_InterfaceBannerPanelInventory.prototype.onSetBonus = function(value)
{
   this.txtBonusValue.setText(value,"Font2");
};
