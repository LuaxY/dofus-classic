Class_CharactersWeapons = function()
{
   this.characters = new Object();
};
Object.registerClass("Dofus::CharactersWeapons",Class_CharactersWeapons);
Class_CharactersWeapons.prototype.addCharacter = function(obj)
{
   this.characters[obj._target] = {obj:obj};
   this.garbageCollector();
};
Class_CharactersWeapons.prototype.garbageCollector = function()
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
Class_CharactersWeapons.prototype.setData = function(objName, characData)
{
   this.characters[objName].data = characData;
};
Class_CharactersWeapons.prototype.applyWeapon = function(obj, side)
{
   var _loc2_ = this;
   var _loc3_ = obj;
   var objName = _loc3_._target;
   var _loc1_;
   for(name in _loc2_.characters)
   {
      if(objName.substring(0,name.length) == name && _loc2_.characters[name] != undefined)
      {
         if(_loc2_.characters[name].data.weapon.gfx == undefined)
         {
            _loc1_ = getGuildText(DATACENTER.Player.data.guild).w[0] + "_1";
         }
         else
         {
            _loc1_ = _loc2_.characters[name].data.weapon.gfx;
         }
         _loc3_.clip.removeMovieClip();
         _loc3_.attachMovie(_loc1_,"clip",10);
         _loc3_.clip.gotoAndStop(side);
         break;
      }
   }
};
