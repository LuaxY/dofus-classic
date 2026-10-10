Class_InterfaceBannerPanelSpells = function()
{
   this.tabList = ["Guild","Water","Fire","Earth","Air"];
   this.init();
};
Class_InterfaceBannerPanelSpells.prototype = new MovieClip();
Object.registerClass("Interface::Banner::Panel::Spells",Class_InterfaceBannerPanelSpells);
Class_InterfaceBannerPanelSpells.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.initBoost();
   _loc1_.currentTab = "Guild";
   _loc1_.txtWater.setText(getText("SPELL_TAB_WATER"),"Font2");
   _loc1_.txtFire.setText(getText("SPELL_TAB_FIRE"),"Font2");
   _loc1_.txtEarth.setText(getText("SPELL_TAB_EARTH"),"Font2");
   _loc1_.txtAir.setText(getText("SPELL_TAB_AIR"),"Font2");
   _loc1_.txtGuild.setText(getText("SPELL_TAB_GUILD"),"Font2");
   _loc1_.tabWater.txtTitle.setText(getText("SPELL_TAB_WATER_TITLE"),"Font2");
   _loc1_.tabFire.txtTitle.setText(getText("SPELL_TAB_FIRE_TITLE"));
   _loc1_.tabEarth.txtTitle.setText(getText("SPELL_TAB_EARTH_TITLE"),"Font2");
   _loc1_.tabAir.txtTitle.setText(getText("SPELL_TAB_AIR_TITLE"),"Font2");
   _loc1_.tabGuild.txtTitle.setText(getText("SPELL_TAB_GUILD_TITLE"),"Font2");
   _loc1_.txtBonus.setText(getText("BONUS"),"Font2");
   _loc1_.txtDrag.setText(getText("PLACE_SPELL_HERE"),"Font1");
   _loc1_.onSetBonus(DATACENTER.Player.data.bonusPoints,"Font2");
   INTERFACE.addToListener(_loc1_);
   DATACENTER.Player.data.addListener(_loc1_);
};
Class_InterfaceBannerPanelSpells.prototype.onSetBonus = function(value)
{
   this.txtBonusValue.setText(value,"Font2");
};
Class_InterfaceBannerPanelSpells.prototype.showTab = function(tabName)
{
   var _loc1_ = this;
   _loc1_["tab" + _loc1_.currentTab]._visible = false;
   _loc1_["tab" + tabName]._visible = true;
   _loc1_.currentTab = tabName;
};
Class_InterfaceBannerPanelSpells.prototype.showNextTab = function()
{
   var _loc2_ = this;
   var _loc1_ = _loc2_.tabList.indexOf(_loc2_.currentTab);
   if((_loc1_ = _loc1_ + 1) > 4)
   {
      _loc1_ = 0;
   }
   _loc2_.showTab(_loc2_.tabList[_loc1_]);
};
Class_InterfaceBannerPanelSpells.prototype.initBoost = function()
{
   var _loc1_ = this;
   _loc1_.sBoost.container.setItem();
   _loc1_.btnBoost.setLabel(getText("BOOST"));
   _loc1_.txtCost.text = "";
   _loc1_.BoostInfos_mc._y = -88.7;
};
Class_InterfaceBannerPanelSpells.prototype.onLostFocus = function()
{
   this.initBoost();
};
