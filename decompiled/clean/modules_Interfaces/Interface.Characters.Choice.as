UICharacterChoiceClass = function()
{
   this.select(false);
};
UICharacterChoiceClass.prototype = new MovieClip();
Object.registerClass("Interface::Characters::Choice",UICharacterChoiceClass);
UICharacterChoiceClass.prototype.select = function(bool)
{
   var _loc1_ = this;
   var _loc2_ = bool;
   _loc1_.selectedMarker.gotoAndStop(!_loc2_ ? 2 : 1);
   _loc1_.btn._visible = !_loc2_;
   if(_loc2_)
   {
      _loc1_.perso.gotoAndStop("castR");
   }
   else
   {
      _loc1_.perso.gotoAndStop("waitR");
      _loc1_.perso.stopAllClip();
   }
};
