Class_InterfaceBannerPanelSpellsInfos = function()
{
};
Class_InterfaceBannerPanelSpellsInfos.prototype = new MovieClip();
Object.registerClass("Interface::Banner::Panel::Spells::Infos",Class_InterfaceBannerPanelSpellsInfos);
Class_InterfaceBannerPanelSpellsInfos.prototype.setSpellInfos = function(spellData)
{
   var _loc1_ = this;
   var _loc2_ = spellData;
   _loc1_.txtName.setText(_loc2_.m_Name,"Font2");
   _loc1_.txtLevel.setText(getText("LEVEL") + " " + _loc2_.m_Level,"Font2");
   _loc1_.txtAPCost.setText(getText("ACTION_POINTS") + " " + _loc2_.m_APCost + " " + getText("AP"),"Font1");
   _loc1_.txtRange.setText(getText("RANGEFULL") + " " + _loc2_.m_Range + " " + getText("RANGE"),"Font1");
   _loc1_.txtDescription.text = _loc2_.m_Description + "\n" + _loc2_.m_DescriptionNormalHit;
   _loc1_.createEmptyMovieClip("icon",1);
   _loc1_.icon._x = -109;
   _loc1_.icon._y = -80;
   _loc1_.icon.loadMovie(_loc2_.iconFile);
};
