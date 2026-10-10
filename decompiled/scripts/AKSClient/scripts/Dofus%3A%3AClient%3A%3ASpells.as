Class_Client_Spells = function(parent)
{
   this._parent = parent;
};
Object.registerClass("Dofus::Client::Spells",Class_Client_Spells);
Class_Client_Spells.onMovement = null;
Class_Client_Spells.prototype.send = function(data, waiting)
{
   this._parent.send(data,waiting);
};
Class_Client_Spells.prototype.moveToUsed = function(ID, position)
{
   this.send("SM" + ID + "|" + position + "\n",false);
};
Class_Client_Spells.prototype.boost = function(ID)
{
   this.send("SB" + ID + "\n",true);
};
Class_Client_Spells.prototype.getInfos = function(spellID)
{
   this.send("SI" + spellID + "\n",false);
};
Class_Client_Spells.prototype.innerOnMovement = function(data)
{
   var dataArray = data.split("|");
   var len = dataArray.length;
   var _loc2_ = 1;
   var _loc1_;
   var _loc3_;
   while(_loc2_ < len)
   {
      _loc1_ = dataArray[_loc2_];
      if(_loc1_.length == 0)
      {
         break;
      }
      if(_loc1_.charAt(0) == "+")
      {
         var spellStr = _loc1_.substring(1);
         _loc3_ = KERNEL.CharactersManager.getSpellObjectFromData(spellStr);
         this._parent.Spells.onMovement(true,_loc3_);
      }
      else
      {
         var spellStr = _loc1_.substring(1);
         this._parent.Spells.onMovement(false,null);
      }
      _loc2_ = _loc2_ + 1;
   }
};
Class_Client_Spells.prototype.innerOnUpgradeSpell = function(data)
{
   var _loc1_ = KERNEL.CharactersManager.getSpellObjectFromData(data);
   DATACENTER.Player.addSpell(_loc1_);
   this.onUpgradeSpell();
};
Class_Client_Spells.prototype.innerOnInfos = function(data)
{
   var _loc2_ = data.split("|");
   var _loc1_ = new Class_DataCenter_Spell();
   _loc1_.m_ID = _loc2_[0];
   _loc1_.m_Level = _loc2_[1];
   _loc1_.m_APCost = _loc2_[2];
   _loc1_.m_Range = _loc2_[3];
   this.onInfos(_loc1_);
};
