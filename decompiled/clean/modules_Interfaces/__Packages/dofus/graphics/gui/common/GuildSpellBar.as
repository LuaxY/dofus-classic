class dofus.graphics.gui.common.GuildSpellBar extends MovieClip
{
   static var COUNT = 10;
   function GuildSpellBar()
   {
      super();
      this.initialize();
   }
   function initialize()
   {
      this.clear();
   }
   function clear()
   {
      var _loc2_ = this;
      var _loc1_;
      _loc1_ = 0;
      while(_loc1_ < dofus.graphics.gui.common.GuildSpellBar.COUNT)
      {
         _loc2_["icon" + _loc1_ + "_mc"].clear();
         _loc1_ = _loc1_ + 1;
      }
   }
   function draw(guildID)
   {
      var _loc3_ = this;
      var _loc1_;
      var _loc2_;
      _loc1_ = 0;
      while(_loc1_ < dofus.graphics.gui.common.GuildSpellBar.COUNT)
      {
         _loc2_ = dofus.Constants.GUILD_SPELLS[guildID][_loc1_];
         _loc3_["icon" + _loc1_ + "_mc"].loadSWF(dofus.Constants.SPELLS_ICONS_PATH + _loc2_ + ".swf");
         _loc1_ = _loc1_ + 1;
      }
   }
}
