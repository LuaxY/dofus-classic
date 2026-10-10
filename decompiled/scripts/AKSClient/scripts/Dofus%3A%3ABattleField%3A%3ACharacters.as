Class_BattleField_Characters = function()
{
   this.init();
};
Class_BattleField_Characters.prototype = new MovieClip();
Object.registerClass("Dofus::BattleField::Characters",Class_BattleField_Characters);
Class_BattleField_Characters.prototype.init = function()
{
   this.createEmptyMovieClip("list",1);
};
Class_BattleField_Characters.prototype.build = function(characterData)
{
   var _loc3_ = this;
   var _loc2_ = characterData.index;
   _loc3_.list["character" + _loc2_].removeMovieClip();
   _loc3_.list.attachMovie("Dofus::BattleField::Characters::Character","character" + _loc2_,_loc2_);
   var _loc1_ = _loc3_.list["character" + _loc2_];
   _loc1_.init(characterData);
   _loc1_.setInteraction(true);
   if(DATACENTER.Game.isMultiplayer)
   {
      _loc1_.select(true);
   }
   characterData.clip = _loc1_;
   return _loc1_;
};
Class_BattleField_Characters.prototype["get"] = function(characterNum)
{
   return this.list["character" + characterNum];
};
Class_BattleField_Characters.prototype.clear = function(characterNum)
{
   this.list["character" + characterNum].clear();
};
Class_BattleField_Characters.prototype.clearAll = function()
{
   var _loc1_ = this;
   for(var _loc2_ in _loc1_.list)
   {
      _loc1_.list[_loc2_].clear();
   }
};
Class_BattleField_Characters.prototype.selectAll = function(bool)
{
   var _loc1_ = this;
   var _loc2_ = bool;
   for(var _loc3_ in _loc1_.list)
   {
      _loc1_.list[_loc3_].select(_loc2_);
   }
};
ASSetPropFlags(Class_BattleField_Characters.prototype,null,1,1);
