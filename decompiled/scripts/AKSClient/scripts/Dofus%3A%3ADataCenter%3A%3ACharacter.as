Class_DataCenter_Character = function()
{
   var _loc1_ = this;
   ASBroadcaster.initialize(_loc1_);
   _loc1_.index = null;
   _loc1_.num = null;
   _loc1_.name = null;
   _loc1_.guild = null;
   _loc1_.clip = null;
   _loc1_.items = null;
   _loc1_.sex = null;
   _loc1_.gfxID = null;
   _loc1_.color1 = null;
   _loc1_.color2 = null;
   _loc1_.color3 = null;
   _loc1_.LPmax = null;
   _loc1_.APinit = null;
   _loc1_.team = null;
   _loc1_.joinPosition = null;
   _loc1_.mainPlayer = false;
   _loc1_.cell = null;
   _loc1_.dir = null;
   _loc1_.bDied = false;
   _loc1_.weapon = new Object();
   _loc1_.SEQUENCER_anim = new Class_Sequencer();
   _loc1_.SEQUENCER_actions = new Class_Sequencer();
   _loc1_.GameActionsManager = new Class_GameActionsManager(_loc1_);
   _loc1_.EffectsManager = new Class_EffectsManager(_loc1_);
};
Object.registerClass("Dofus::DataCenter::Character",Class_DataCenter_Character);
Class_DataCenter_Character.prototype.addProperty("level",function()
{
   return this.m_Level;
}
,function(value)
{
   this.m_Level = Number(value);
   this.broadcastMessage("onSetLevel",value);
}
);
Class_DataCenter_Character.prototype.addProperty("XP",function()
{
   return this.m_XP;
}
,function(value)
{
   this.m_XP = Number(value);
   this.broadcastMessage("onSetXP",value);
}
);
Class_DataCenter_Character.prototype.addProperty("LP",function()
{
   return this.m_LP;
}
,function(value)
{
   var _loc1_ = this;
   _loc1_.m_LP = Number(value);
   _loc1_.broadcastMessage("onSetLP",value,_loc1_.LPmax);
}
);
Class_DataCenter_Character.prototype.addProperty("AP",function()
{
   return this.m_AP;
}
,function(value)
{
   this.m_AP = Number(value);
   this.broadcastMessage("onSetAP",value);
}
);
Class_DataCenter_Character.prototype.addProperty("GP",function()
{
   return this.m_GP;
}
,function(value)
{
   this.m_GP = Number(value);
   this.broadcastMessage("onSetGP",value);
}
);
Class_DataCenter_Character.prototype.addProperty("force",function()
{
   return this.m_Force;
}
,function(value)
{
   this.m_Force = Number(value);
   this.broadcastMessage("onSetForce",value);
}
);
Class_DataCenter_Character.prototype.addProperty("vitality",function()
{
   return this.m_Vitality;
}
,function(value)
{
   this.m_Vitality = Number(value);
   this.broadcastMessage("onSetVitality",value);
}
);
Class_DataCenter_Character.prototype.addProperty("rFire",function()
{
   return this.m_rFire;
}
,function(value)
{
   this.m_rFire = Number(value);
   this.broadcastMessage("onSetFire",value);
}
);
Class_DataCenter_Character.prototype.addProperty("rAir",function()
{
   return this.m_rAir;
}
,function(value)
{
   this.m_rAir = Number(value);
   this.broadcastMessage("onSetAir",value);
}
);
Class_DataCenter_Character.prototype.addProperty("rWater",function()
{
   return this.m_rWater;
}
,function(value)
{
   this.m_rWater = Number(value);
   this.broadcastMessage("onSetWater",value);
}
);
Class_DataCenter_Character.prototype.addProperty("rEarth",function()
{
   return this.m_rEarth;
}
,function(value)
{
   this.m_rEarth = Number(value);
   this.broadcastMessage("onSetEarth",value);
}
);
Class_DataCenter_Character.prototype.addProperty("charism",function()
{
   return this.m_Charism;
}
,function(value)
{
   this.m_Charism = Number(value);
   this.broadcastMessage("onSetCharism",value);
}
);
Class_DataCenter_Character.prototype.addProperty("karma",function()
{
   return this.m_Karma;
}
,function(value)
{
   this.m_Karma = Number(value);
   this.broadcastMessage("onSetKarma",value);
}
);
Class_DataCenter_Character.prototype.addProperty("agility",function()
{
   return this.m_Agility;
}
,function(value)
{
   this.m_Agility = Number(value);
   this.broadcastMessage("onSetAgility",value);
}
);
Class_DataCenter_Character.prototype.addProperty("intelligence",function()
{
   return this.m_Intelligence;
}
,function(value)
{
   this.m_Intelligence = Number(value);
   this.broadcastMessage("onSetIntelligence",value);
}
);
Class_DataCenter_Character.prototype.addProperty("bonusPoints",function()
{
   return this.m_BonusPoints;
}
,function(value)
{
   this.m_BonusPoints = Number(value);
   this.broadcastMessage("onSetBonus",value);
}
);
Class_DataCenter_Character.prototype.addProperty("file",function()
{
   return CLIPS_PERSOS_PATH + this.gfxID + ".swf";
}
,null);
Class_DataCenter_Character.prototype.addProperty("guildName",function()
{
   return GUILD_NAMES[this.guild];
}
,null);
Class_DataCenter_Character.prototype.addProperty("isDied",function()
{
   return this.bDied;
}
,null);
Class_DataCenter_Character.prototype.updateLP = function(dLP)
{
   this.LP += Number(dLP);
   this.clip.showPoints("life",Number(dLP));
};
Class_DataCenter_Character.prototype.initLP = function()
{
   var _loc1_ = this;
   _loc1_.LP = _loc1_.LPmax;
   _loc1_.clip.showPoints("life",dLP);
};
Class_DataCenter_Character.prototype.updateAP = function(dAP, bNextTurn)
{
   var _loc1_ = this;
   if(bNextTurn == undefined)
   {
      bNextTurn = true;
   }
   _loc1_.AP += Number(dAP);
   _loc1_.clip.showPoints("action",dAP);
   if(_loc1_.num == DATACENTER.Player.ID)
   {
      if(DATACENTER.Player.noMoreAP)
      {
         INTERFACE.messageNextTurn();
      }
   }
};
Class_DataCenter_Character.prototype.initAP = function(bWithModerator)
{
   var _loc1_ = this;
   var _loc2_ = bWithModerator;
   if(_loc2_ == undefined)
   {
      _loc2_ = true;
   }
   var _loc3_;
   if(_loc2_)
   {
      _loc3_ = _loc1_.EffectsManager.getModeratorValue(1);
      _loc1_.AP = Number(_loc1_.APinit) + Number(_loc3_);
   }
   else
   {
      _loc1_.AP = Number(_loc1_.APinit);
   }
};
Class_DataCenter_Character.prototype.update = function(key, value)
{
   this[key] += Number(value);
};
Class_DataCenter_Character.prototype.getEffects = function()
{
   return this.EffectsManager.getEffects();
};
ASSetPropFlags(Class_DataCenter_Character.prototype,null,1,1);
