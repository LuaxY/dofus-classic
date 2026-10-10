Class_CharactersColors = function()
{
   this.characters = new Object();
};
Object.registerClass("Dofus::CharactersColors",Class_CharactersColors);
Class_CharactersColors.prototype.addCharacter = function(obj)
{
   this.characters[obj._target] = {obj:obj};
   this.garbageCollector();
};
Class_CharactersColors.prototype.garbageCollector = function()
{
   var _loc1_ = this;
   for(o in _loc1_.characters)
   {
      if(_loc1_.characters[o].obj._target == undefined)
      {
         delete _loc1_.characters[o];
      }
   }
};
Class_CharactersColors.prototype.setColor = function(objName, color1, color2, color3)
{
   var _loc1_ = this;
   var _loc2_ = objName;
   if(color1 != -1)
   {
      _loc1_.characters[_loc2_].color1 = color1;
   }
   if(color2 != -1)
   {
      _loc1_.characters[_loc2_].color2 = color2;
   }
   if(color3 != -1)
   {
      _loc1_.characters[_loc2_].color3 = color3;
   }
};
Class_CharactersColors.prototype.applyColor = function(obj, zone)
{
   var _loc2_ = this;
   var objName = obj._target;
   var _loc1_ = new String();
   var _loc3_;
   for(_loc1_ in _loc2_.characters)
   {
      if(objName.substring(0,_loc1_.length) == _loc1_ && _loc2_.characters[_loc1_]["color" + zone] != undefined)
      {
         var r = (_loc2_.characters[_loc1_]["color" + zone] & 0xFF0000) >> 16;
         var v = (_loc2_.characters[_loc1_]["color" + zone] & 0xFF00) >> 8;
         var b = _loc2_.characters[_loc1_]["color" + zone] & 0xFF;
         var maCouleur = new Color(obj);
         _loc3_ = new Object();
         _loc3_ = {ra:"0",rb:r,ga:"0",gb:v,ba:"0",bb:b,aa:"100",ab:"0"};
         maCouleur.setTransform(_loc3_);
         break;
      }
   }
};
