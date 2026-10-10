class dofus.graphics.gui.UICreateCharacter extends MovieClip
{
   var m_colors;
   var m_guildID;
   var m_sex;
   var spellViewer_mc;
   function UICreateCharacter()
   {
      super();
      this.initialize();
   }
   function get guildID()
   {
      return this.m_guildID;
   }
   function get sex()
   {
      return this.m_sex;
   }
   function get colors()
   {
      return this.m_colors;
   }
   function initialize()
   {
      var _loc1_ = this;
      _loc1_.m_guildID = new Number();
      _loc1_.m_sex = new Number();
      _loc1_.m_colors = [0,-1,-1,-1];
      _loc1_.title_txt.setText(dofus.Translator.getText("CREATE_TITLE"),"Font2");
      _loc1_.onEnterFrame = function()
      {
         var _loc1_ = this;
         _loc1_.chooseGuild(1);
         _loc1_.chooseSex(0);
         delete _loc1_.onEnterFrame;
      };
   }
   function chooseGuild(gid)
   {
      var _loc1_ = this;
      var _loc2_ = gid;
      if(_loc1_.m_guildID != _loc2_)
      {
         _loc1_.viewSpellInfos(dofus.Constants.GUILD_SPELLS[_loc2_][0]);
         _loc1_.m_guildID = _loc2_;
         _loc1_.guildName_txt.setText(dofus.Translator.getGuildInfos(_loc2_).ln,"Font2");
         _loc1_.guildDescription_txt.text = dofus.Translator.getGuildInfos(_loc2_).d;
         _loc1_.spellBar_mc.draw(_loc2_);
         _loc1_.bigCharac_mc.man_mc.show(_loc2_,0);
         _loc1_.bigCharac_mc.woman_mc.show(_loc2_,1);
         _loc1_.swfLoader_mc.loadSWF(dofus.Constants.GUILDS_SYMBOL_PATH + "symbols.swf",_loc2_);
      }
   }
   function chooseSex($sex)
   {
      var _loc1_ = $sex;
      var _loc2_ = this;
      if(_loc2_.m_sex != _loc1_)
      {
         _loc2_.m_sex = _loc1_;
         _loc2_.bigCharac_mc.rotate(_loc1_);
      }
   }
   function chooseColor(col, colorID)
   {
      this.m_colors[colorID] = col;
   }
   function createCharacter(name)
   {
      var _loc1_ = this;
      var _loc3_ = name;
      var _loc2_ = true;
      if(_loc3_.length == 0)
      {
         _global.INTERFACE.msgBox(dofus.Translator.getText("NEED_CHARACTER_NAME",[]));
         _loc2_ = false;
      }
      if(_loc3_.length > 20)
      {
         _global.INTERFACE.msgBox(dofus.Translator.getText("LONG_CHARACTER_NAME",[_loc3_,20]));
         _loc2_ = false;
      }
      if(_loc2_)
      {
         _global.AKS.Account.addCharacter(_loc3_,_loc1_.guildID,_loc1_.colors[1],_loc1_.colors[2],_loc1_.colors[3],_loc1_.sex);
      }
   }
   function viewSpellInfos(sid)
   {
      if(sid == null)
      {
         this.spellViewer_mc.clear();
      }
      else
      {
         this.spellViewer_mc.view(sid);
      }
   }
}
