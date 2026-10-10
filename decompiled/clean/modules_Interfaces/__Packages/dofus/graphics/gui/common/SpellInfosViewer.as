class dofus.graphics.gui.common.SpellInfosViewer extends MovieClip
{
   function SpellInfosViewer()
   {
      super();
      this.initialize();
   }
   function initialize()
   {
      this.clear();
   }
   function clear(Void)
   {
      var _loc1_ = this;
      _loc1_.name_txt.setText("","Font2");
      _loc1_.level_txt.setText("","Font2");
      _loc1_.apCost_txt.setText("","Font1");
      _loc1_.range_txt.setText("","Font1");
      _loc1_.description_txt.text = "";
      _loc1_.swfLoader_mc.clear();
   }
   function view(spellID)
   {
      var _loc2_ = this;
      var _loc1_ = _loc2_.getSpellInfos(spellID);
      _loc2_.name_txt.setText(_loc1_.name,"Font2");
      _loc2_.level_txt.setText(dofus.Translator.getText("LEVEL") + " " + _loc1_.level,"Font2");
      _loc2_.apCost_txt.setText(dofus.Translator.getText("ACTION_POINTS") + " " + _loc1_.apCost + " " + dofus.Translator.getText("AP"),"Font1");
      _loc2_.range_txt.setText(dofus.Translator.getText("RANGEFULL") + " " + _loc1_.range + " " + dofus.Translator.getText("RANGE"),"Font1");
      _loc2_.description_txt.text = _loc1_.description + "\n" + _loc1_.descriptionNormalHit;
      _loc2_.swfLoader_mc.loadSWF(_loc1_.file);
   }
   function getSpellInfos(spellID)
   {
      var _loc2_ = dofus.Translator.getSpellInfos(spellID);
      var _loc1_ = new Object();
      _loc1_.name = _loc2_.n;
      _loc1_.apCost = _loc2_.l1[2];
      _loc1_.range = _loc2_.l1[3];
      _loc1_.description = _loc2_.d;
      _loc1_.descriptionNormalHit = _loc2_.l1[0];
      _loc1_.file = dofus.Constants.SPELLS_ICONS_PATH + spellID + ".swf";
      return _loc1_;
   }
}
