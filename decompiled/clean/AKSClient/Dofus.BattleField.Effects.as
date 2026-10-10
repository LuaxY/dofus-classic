Class_BattleField_Effects = function()
{
   this.init();
};
Class_BattleField_Effects.prototype = new Object();
Object.registerClass("Dofus::BattleField::Effects",Class_BattleField_Effects);
Class_BattleField_Effects.prototype.init = function()
{
   this.container = BATTLEFIELD.Container;
};
Class_BattleField_Effects.prototype.setVisible = function(bool)
{
   this.container.Effects._visible = bool;
};
Class_BattleField_Effects.prototype.load = function(file)
{
   this.container.Effect.loadMovie(file);
};
Class_BattleField_Effects.prototype.unload = function()
{
   this.container.Effect.loadMovie("");
};
ASSetPropFlags(Class_BattleField_Effects.prototype,null,1,1);
