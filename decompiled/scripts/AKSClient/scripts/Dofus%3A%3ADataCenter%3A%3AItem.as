Class_DataCenter_Item = function()
{
   var _loc1_ = this;
   _loc1_.m_ID = null;
   _loc1_.m_Type = null;
   _loc1_.m_Gfx = null;
   _loc1_.m_Color = null;
   _loc1_.m_Position = null;
   _loc1_.m_Effects = new Array();
};
Object.registerClass("Dofus::DataCenter::Item",Class_DataCenter_Item);
Class_DataCenter_Item.prototype.setEffects = function(compressedData)
{
   var _loc2_;
   var effectsArray = compressedData.split(",");
   var _loc1_;
   var _loc3_ = 0;
   while(_loc3_ < effectsArray.length)
   {
      _loc1_ = effectsArray[_loc3_].split("#");
      _loc2_ = new Object();
      _loc2_.type = parseInt(_loc1_[0],16);
      if(_loc1_[1] == undefined)
      {
         _loc2_.bDescription = false;
      }
      else
      {
         _loc2_.bDescription = true;
         _loc2_.param1 = _loc1_[1] != "0" ? parseInt(_loc1_[1],16) : undefined;
         _loc2_.param2 = _loc1_[2] != "0" ? parseInt(_loc1_[2],16) : undefined;
         _loc2_.param3 = _loc1_[3] != "0" ? parseInt(_loc1_[3],16) : undefined;
      }
      this.m_Effects.push(_loc2_);
      _loc3_ = _loc3_ + 1;
   }
};
Class_DataCenter_Item.prototype.addProperty("iconFile",function()
{
   var _loc1_ = this;
   if(_loc1_.m_Effects.length == 0)
   {
      return dofus.Constants.ITEMS_PATH + "0.swf";
   }
   return dofus.Constants.ITEMS_PATH + _loc1_.m_Type + "/" + _loc1_.m_Gfx + ".swf";
}
,null);
Class_DataCenter_Item.prototype.addProperty("typeText",function()
{
   return getItemTypeText(this.m_Type);
}
,null);
Class_DataCenter_Item.prototype.addProperty("superType",function()
{
   return this.typeText.t;
}
,null);
Class_DataCenter_Item.prototype.addProperty("superTypeText",function()
{
   return getItemSuperTypeText(this.typeText.t);
}
,null);
Class_DataCenter_Item.prototype.addProperty("gender",function()
{
   var _loc1_ = ["m","f","n"];
   return _loc1_[this.typeText.g];
}
,null);
Class_DataCenter_Item.prototype.addProperty("name",function()
{
   var _loc2_ = this;
   var n = _loc2_.typeText.n;
   n = n.charAt(0).toUpperCase() + n.slice(1);
   var _loc1_;
   var _loc3_;
   var g = _loc2_.gender;
   var p = !_loc2_.typeText.s;
   _loc1_ = 0;
   while(_loc1_ < _loc2_.m_Effects.length)
   {
      _loc3_ = _loc2_.m_Effects[_loc1_];
      n += " " + ank.PatternDecoder.combine(getItemEffectText(_loc3_.type).n,g,p);
      _loc1_ = _loc1_ + 1;
   }
   return n;
}
,null);
Class_DataCenter_Item.prototype.addProperty("description",function()
{
   var _loc3_ = new String();
   var _loc2_;
   var _loc1_;
   _loc2_ = 0;
   while(_loc2_ < this.m_Effects.length)
   {
      _loc1_ = this.m_Effects[_loc2_];
      if(_loc1_.bDescription)
      {
         _loc3_ += ank.PatternDecoder.getDescription(getItemEffectText(_loc1_.type).d,new Array(_loc1_.param1,_loc1_.param2,_loc1_.param3));
         _loc3_ += "\n";
      }
      _loc2_ = _loc2_ + 1;
   }
   return _loc3_;
}
,null);
Class_DataCenter_Item.prototype.addProperty("canEquip",function()
{
   var _loc3_ = true;
   var _loc2_;
   var _loc1_;
   if(this.superType == 2)
   {
      _loc3_ = false;
      _loc2_ = getGuildText(DATACENTER.Player.data.guild).w;
      var type = this.m_Type;
      _loc1_ = 0;
      while(_loc1_ < _loc2_.length)
      {
         if(_loc2_[_loc1_] == type)
         {
            _loc3_ = true;
            break;
         }
         _loc1_ = _loc1_ + 1;
      }
   }
   return _loc3_;
}
,null);
Class_DataCenter_Item.prototype.addProperty("colorObject",function()
{
   var _loc2_ = this;
   var _loc1_ = new Object();
   if(!isNan(_loc2_.m_ColorRed))
   {
      _loc1_.ra = _loc2_.m_ColorRed;
      _loc1_.rb = 20;
      _loc1_.ga = _loc2_.m_ColorGreen;
      _loc1_.gb = 20;
      _loc1_.ba = _loc2_.m_ColorBlue;
      _loc1_.bb = 20;
   }
   return _loc1_;
}
,null);
ASSetPropFlags(Class_DataCenter_Item.prototype,null,1,1);
