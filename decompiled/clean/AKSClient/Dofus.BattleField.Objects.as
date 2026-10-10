Class_BattleField_Objects = function()
{
   this.init();
};
Class_BattleField_Objects.prototype = new MovieClip();
Object.registerClass("Dofus::BattleField::Objects",Class_BattleField_Objects);
Class_BattleField_Objects.prototype.init = function()
{
   this.createEmptyMovieClip("list",1);
};
Class_BattleField_Objects.prototype.build = function(objectData, cell, cellData)
{
   var _loc1_ = cell;
   var _loc2_ = this;
   _loc2_.list.attachMovie("Dofus::BattleField::Objects::Object","object" + _loc1_,_loc1_);
   _loc2_.list["object" + _loc1_].init(objectData,_loc1_,cellData);
   return _loc2_.list["object" + _loc1_];
};
Class_BattleField_Objects.prototype["get"] = function(cellNum)
{
   return this.list["object" + cellNum];
};
Class_BattleField_Objects.prototype.clear = function(cellNum)
{
   this.list["object" + cellNum].clear();
};
Class_BattleField_Objects.prototype.clearAll = function()
{
   this.init();
};
Class_BattleField_Objects.prototype.selectAll = function(bool)
{
   var _loc1_ = this;
   var _loc2_ = bool;
   for(var _loc3_ in _loc1_.list)
   {
      _loc1_.list[_loc3_].select(_loc2_);
   }
};
ASSetPropFlags(Class_BattleField_Objects.prototype,null,1,1);
