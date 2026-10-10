Class_EffectsManager = function(characData)
{
   var _loc1_ = this;
   _loc1_.characData = characData;
   _loc1_.init();
   _loc1_.LIFE_POINTS = 0;
   _loc1_.ACTION_POINTS = 1;
   _loc1_.GOLD = 2;
   _loc1_.STATS_POINTS = 3;
   _loc1_.EXPERIENCE = 4;
   _loc1_.LEVEL = 5;
   _loc1_.RES_FIRE = 6;
   _loc1_.RES_AIR = 7;
   _loc1_.RES_WATER = 8;
   _loc1_.RES_EARTH = 9;
   _loc1_.STRENGTH = 10;
   _loc1_.VITALITY = 11;
   _loc1_.CHARISM = 12;
   _loc1_.KARMA = 13;
   _loc1_.AGILITY = 14;
   _loc1_.INTELLIGENCE = 15;
   _loc1_.DAMAGES = 16;
   _loc1_.DAMAGES_FACTOR = 17;
   _loc1_.CRITICAL_HIT = 18;
   _loc1_.RANGE = 19;
};
Object.registerClass("Dofus::EffectsManager",Class_EffectsManager);
Class_EffectsManager.prototype.init = function()
{
   var _loc2_ = this;
   _loc2_.Effects = new Array();
   _loc2_.Moderators = new Array(20);
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.Moderators.length)
   {
      _loc2_.Moderators[_loc1_] = 0;
      _loc1_ = _loc1_ + 1;
   }
};
Class_EffectsManager.prototype.getEffects = function()
{
   return this.Effects;
};
Class_EffectsManager.prototype.getModeratorValue = function(type)
{
   var _loc1_ = Number(type);
   return this.Moderators[_loc1_];
};
Class_EffectsManager.prototype.addEffect = function(effectData)
{
   var _loc1_ = effectData;
   trace("addEffect");
   trace("effectData.value : " + _loc1_.value);
   trace("remainingTurn : " + _loc1_.remainingTurn);
   this.Effects.push(_loc1_);
   this.onEffectStart(_loc1_);
};
Class_EffectsManager.prototype.nextTurn = function()
{
   var _loc3_ = this;
   var len = _loc3_.Effects.length;
   var _loc1_;
   var _loc2_;
   _loc1_ = 0;
   while(_loc1_ < len)
   {
      _loc2_ = _loc3_.Effects[_loc1_];
      _loc2_.remainingTurn = _loc2_.remainingTurn - 1;
      trace("nextTurn");
      trace("effect.type : " + _loc2_.type);
      trace("effect.remainingTurn : " + _loc2_.remainingTurn);
      if(_loc2_.remainingTurn < 0)
      {
         _loc3_.onEffectEnd(_loc3_.Effects[_loc1_]);
         _loc3_.Effects.splice(_loc1_,_loc1_ + 1);
      }
      _loc1_ = _loc1_ + 1;
   }
};
Class_EffectsManager.prototype.onEffectStart = function(effect)
{
   var _loc1_ = this;
   var _loc2_ = effect;
   switch(_loc2_.type)
   {
      case _loc1_.LIFE_POINTS:
      case _loc1_.ACTION_POINTS:
      case _loc1_.GOLD:
      case _loc1_.STATS_POINTS:
      case _loc1_.EXPERIENCE:
      case _loc1_.LEVEL:
      case _loc1_.RES_FIRE:
      case _loc1_.RES_AIR:
      case _loc1_.RES_WATER:
      case _loc1_.RES_EARTH:
      case _loc1_.STRENGTH:
      case _loc1_.VITALITY:
      case _loc1_.CHARISM:
      case _loc1_.KARMA:
      case _loc1_.AGILITY:
      case _loc1_.INTELLIGENCE:
      case _loc1_.DAMAGES:
      case _loc1_.DAMAGES_FACTOR:
      case _loc1_.CRITICAL_HIT:
      case _loc1_.RANGE:
         trace("onEffectStart");
         trace(Number(_loc2_.type));
         trace(Number(_loc2_.value));
         _loc1_.Moderators[Number(_loc2_.type)] += Number(_loc2_.value);
         trace(_loc1_.Moderators);
         return;
      default:
         trace("Error : Mauvais type d\'effet");
         return;
   }
};
Class_EffectsManager.prototype.onEffectEnd = function(effect)
{
   var _loc1_ = this;
   var _loc2_ = effect;
   switch(_loc2_.type)
   {
      case _loc1_.LIFE_POINTS:
      case _loc1_.ACTION_POINTS:
      case _loc1_.GOLD:
      case _loc1_.STATS_POINTS:
      case _loc1_.EXPERIENCE:
      case _loc1_.LEVEL:
      case _loc1_.RES_FIRE:
      case _loc1_.RES_AIR:
      case _loc1_.RES_WATER:
      case _loc1_.RES_EARTH:
      case _loc1_.VITALITY:
      case _loc1_.CHARISM:
      case _loc1_.KARMA:
      case _loc1_.AGILITY:
      case _loc1_.INTELLIGENCE:
      case _loc1_.DAMAGES:
      case _loc1_.DAMAGES_FACTOR:
      case _loc1_.CRITICAL_HIT:
      case _loc1_.RANGE:
         trace("onEffectEnd");
         trace("Nouvelle valeur pour " + Number(_loc2_.type) + " " + Number(_loc2_.value));
         _loc1_.Moderators[Number(_loc2_.type)] -= Number(_loc2_.value);
         return;
      case _loc1_.STRENGTH:
         trace("onEffectEnd");
         trace("Nouvelle valeur pour " + Number(_loc2_.type) + " -" + Number(_loc2_.value));
         _loc1_.Moderators[Number(_loc2_.type)] -= Number(_loc2_.value);
         _loc1_.characData.force -= Number(_loc2_.value);
         return;
      default:
         trace("Error : Mauvais type d\'effet");
         return;
   }
};
