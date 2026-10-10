Class_InterfaceBannerPanelSpellsBoostInfos = function()
{
   this.txtCharacteristics.text = getText("NEW_CHARACTERISTICS");
};
Class_InterfaceBannerPanelSpellsBoostInfos.prototype = new MovieClip();
Object.registerClass("Interface::Banner::Panel::Spells::BoostInfos",Class_InterfaceBannerPanelSpellsBoostInfos);
Class_InterfaceBannerPanelSpellsBoostInfos.prototype.setSpellInfos = function(oldSpellData, spellData)
{
   var _loc1_ = this;
   var _loc2_ = spellData;
   var _loc3_ = oldSpellData;
   _loc1_.txtName.setText(_loc2_.m_Name,"Font2");
   _loc1_.txtCHaracteristics.setText(getText("NEW_CHARACTERISTICS"),"Font2");
   _loc1_.txtOldLevel.setText(getText("LEVEL") + " " + _loc3_.m_Level,"Font2");
   _loc1_.txtOldAPCost.setText(_loc3_.m_APCost + " " + getText("AP"),"Font2");
   _loc1_.txtOldRange.setText(_loc3_.m_Range + " " + getText("Range"),"Font2");
   _loc1_.txtOldNormHit.setText(_loc3_.m_DescriptionNormalHit,"Font2");
   _loc1_.txtLevel.setText(getText("LEVEL") + " " + _loc2_.m_Level,"Font2");
   _loc1_.txtAPCost.setText(_loc2_.m_APCost + " " + getText("AP"),"Font2");
   _loc1_.txtRange.setText(_loc2_.m_Range + " " + getText("Range"),"Font2");
   _loc1_.txtNormHit.setText(_loc2_.m_DescriptionNormalHit,"Font2");
   _loc1_.createEmptyMovieClip("icon",1);
   _loc1_.icon._x = -109;
   _loc1_.icon._y = -80;
   _loc1_.icon.loadMovie(_loc2_.iconFile);
};
