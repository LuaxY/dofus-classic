Class_BattleField = function()
{
   _global.BATTLEFIELD = this;
   this.init();
};
Class_BattleField.prototype = new MovieClip();
Object.registerClass("Dofus::BattleField",Class_BattleField);
Class_BattleField.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.attachMovie("Dofus::BattleField::Container","Container",100);
   _loc1_.attachMovie("Dofus::BattleField::Objects","Objects",200);
   _loc1_.attachMovie("Dofus::BattleField::Map","Map",300);
   _loc1_.attachMovie("Dofus::BattleField::Selection","Selection",400);
   _loc1_.attachMovie("Dofus::BattleField::Pointer","Pointer",500);
   _loc1_.attachMovie("Dofus::BattleField::Characters","Characters",600);
   _loc1_.attachMovie("Dofus::BattleField::Spells","Spells",700);
   _loc1_.attachMovie("Dofus::BattleField::Effects","Effects",800);
   _loc1_.attachMovie("Dofus::BattleField::Interaction","Interaction",900);
};
Class_BattleField.prototype.clear = function()
{
   var _loc1_ = this;
   _loc1_.Characters.clearAll();
   _loc1_.Objects.clearAll();
   _loc1_.Container.clear();
   _loc1_.Interaction.init();
};
Class_BattleField.prototype.setRoundMask = function(ray, cell)
{
   var _loc1_ = this;
   if(!_loc1_.MaskClip)
   {
      _loc1_.attachMovie("maskRond","MaskClip",1100);
      _loc1_.Container.setMask(_loc1_.MaskClip);
   }
   _loc1_.MaskClip._x = DATACENTER.Map.data[cell].x;
   _loc1_.MaskClip._y = DATACENTER.Map.data[cell].y;
};
ASSetPropFlags(Class_BattleField.prototype,null,1,1);
