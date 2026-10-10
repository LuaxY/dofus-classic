Class_CharactersManager = function()
{
};
Object.registerClass("Dofus::CharactersManager",Class_CharactersManager);
Class_CharactersManager.prototype.clearAllOthersCharacters = function()
{
   var _loc2_ = DATACENTER.Player.ID;
   var _loc1_;
   for(var _loc3_ in DATACENTER.Characters.keys)
   {
      _loc1_ = DATACENTER.Characters.getItemAt(_loc3_);
      if(_loc1_.num != _loc2_)
      {
         DATACENTER.Characters.setItemAt(_loc3_,undefined);
      }
   }
};
Class_CharactersManager.prototype.createCharacter = function(i, name, ca)
{
   var _loc1_ = ca;
   var _loc3_ = i;
   var _loc2_ = DATACENTER.Characters.getItemAt(_loc3_);
   if(_loc2_ == undefined)
   {
      _loc2_ = new Class_DataCenter_Character();
      DATACENTER.Characters.setItemAt(_loc3_,_loc2_);
   }
   _loc2_.GameActionsManager.init();
   _loc2_.index = Number(_loc3_);
   _loc2_.num = Number(_loc3_);
   _loc2_.name = name;
   _loc2_.guild = _loc1_.guild;
   _loc2_.level = _loc1_.level;
   _loc2_.clip = null;
   _loc2_.items = new Array();
   _loc2_.sex = _loc1_.sex == undefined ? 1 : _loc1_.sex;
   _loc2_.gfxID = _loc1_.gfxID == undefined ? 0 : _loc1_.gfxID;
   _loc2_.color1 = _loc1_.color1 != -1 ? Number("0x" + _loc1_.color1) : _loc1_.color1;
   _loc2_.color2 = _loc1_.color2 != -1 ? Number("0x" + _loc1_.color2) : _loc1_.color2;
   _loc2_.color3 = _loc1_.color3 != -1 ? Number("0x" + _loc1_.color3) : _loc1_.color3;
   if(_loc1_.weapon.length != 0)
   {
      var a = _loc1_.weapon.split(",");
      _loc2_.weapon = new Object();
      _loc2_.weapon.gfx = parseInt(a[0],16) + "_" + parseInt(a[1],16);
      _loc2_.weapon.colorRed = parseInt(a[2].substring(0,2),16);
      _loc2_.weapon.colorGreen = parseInt(a[2].substring(2,4),16);
      _loc2_.weapon.colorBlue = parseInt(a[2].substring(4,6),16);
   }
   else
   {
      _loc2_.weapon = new Object();
      _loc2_.weapon.gfx = getGuildText(_loc2_.guild).w[0] + "_1";
   }
   if(_loc1_.LP != undefined)
   {
      _loc2_.LP = Number(_loc1_.LP);
   }
   if(_loc1_.LP != undefined)
   {
      _loc2_.LPmax = Number(_loc1_.LP);
   }
   if(_loc1_.AP != undefined)
   {
      _loc2_.AP = Number(_loc1_.AP);
   }
   if(_loc1_.AP != undefined)
   {
      _loc2_.APinit = Number(_loc1_.AP);
   }
   if(_loc1_.GP != undefined)
   {
      _loc2_.GP = Number(_loc1_.GP);
   }
   if(_loc1_.XPlow != undefined)
   {
      _loc2_.XPlow = _loc1_.XPlow;
   }
   if(_loc1_.XP != undefined)
   {
      _loc2_.XP = _loc1_.XP;
   }
   if(_loc1_.XPhigh != undefined)
   {
      _loc2_.XPhigh = _loc1_.XPhigh;
   }
   if(_loc1_.force != undefined)
   {
      _loc2_.force = _loc1_.force;
   }
   if(_loc1_.vitality != undefined)
   {
      _loc2_.vitality = _loc1_.vitality;
   }
   if(_loc1_.rFire != undefined)
   {
      _loc2_.rFire = _loc1_.rFire;
   }
   if(_loc1_.rAir != undefined)
   {
      _loc2_.rAir = _loc1_.rAir;
   }
   if(_loc1_.rWater != undefined)
   {
      _loc2_.rWater = _loc1_.rWater;
   }
   if(_loc1_.rEarth != undefined)
   {
      _loc2_.rEarth = _loc1_.rEarth;
   }
   if(_loc1_.charism != undefined)
   {
      _loc2_.charism = _loc1_.charism;
   }
   if(_loc1_.karma != undefined)
   {
      _loc2_.karma = _loc1_.karma;
   }
   if(_loc1_.agility != undefined)
   {
      _loc2_.agility = _loc1_.agility;
   }
   if(_loc1_.intelligence != undefined)
   {
      _loc2_.intelligence = _loc1_.intelligence;
   }
   if(_loc1_.bonusPoints != undefined)
   {
      _loc2_.bonusPoints = _loc1_.bonusPoints;
   }
   _loc2_.team = _loc1_.team != undefined ? Number(_loc1_.team) : null;
   _loc2_.joinPosition = _loc1_.joinPosition != undefined ? Number(_loc1_.joinPosition) : null;
   _loc2_.cell = _loc1_.cell != undefined ? Number(_loc1_.cell) : null;
   _loc2_.dir = _loc1_.dir != undefined ? Number(_loc1_.celdirl) : null;
   _loc2_.bDied = false;
   if(_loc1_.cc)
   {
      DATACENTER.Player.setCCData(_loc1_.cc);
   }
   var spellsArray = _loc1_.spells.split(";");
   _loc3_ = 0;
   while(_loc3_ < spellsArray.length)
   {
      var s = this.getSpellObjectFromData(spellsArray[_loc3_]);
      DATACENTER.Player.addSpell(s);
      _loc3_ = _loc3_ + 1;
   }
   var itemsArray = _loc1_.items.split(";");
   _loc3_ = 0;
   while(_loc3_ < itemsArray.length)
   {
      var item = this.getItemObjectFromData(itemsArray[_loc3_]);
      if(item != undefined)
      {
         DATACENTER.Player.addItem(item);
      }
      _loc3_ = _loc3_ + 1;
   }
   return _loc2_;
};
Class_CharactersManager.prototype.createNewCharacter = function()
{
   INTERFACE.clear();
   INTERFACE.draw("dofus::graphics::gui::UICreateCharacter",1);
};
Class_CharactersManager.prototype.getSpellObjectFromData = function(data)
{
   var _loc2_ = data.split("~");
   var _loc1_ = new Class_DataCenter_Spell();
   _loc1_.m_ID = _loc2_[0];
   _loc1_.m_Level = Number(_loc2_[1]);
   _loc1_.setEffectZones(_loc2_[2]);
   _loc1_.setAdditionalData(_loc2_[3]);
   return _loc1_;
};
Class_CharactersManager.prototype.getItemObjectFromData = function(data)
{
   var _loc1_;
   var _loc2_;
   if(data.length != 0)
   {
      _loc1_ = data.split("~");
      _loc2_ = new Class_DataCenter_Item();
      _loc2_.m_ID = parseInt(_loc1_[0],16);
      _loc2_.m_Type = parseInt(_loc1_[1],16);
      _loc2_.m_Gfx = parseInt(_loc1_[2],16);
      _loc2_.m_ColorRed = parseInt(_loc1_[3].substring(0,2),16);
      _loc2_.m_ColorGreen = parseInt(_loc1_[3].substring(2,4),16);
      _loc2_.m_ColorBlue = parseInt(_loc1_[3].substring(4,6),16);
      _loc2_.m_Position = _loc1_[4].length != 0 ? parseInt(_loc1_[4],16) : -1;
      _loc2_.setEffects(_loc1_[5]);
      return _loc2_;
   }
};
