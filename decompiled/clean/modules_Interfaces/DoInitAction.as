Class_CreateCharacter = function()
{
   var _loc1_ = this;
   _loc1_.mColor1 = -1;
   _loc1_.mColor2 = -1;
   _loc1_.mColor3 = -1;
   _loc1_.mGuild = DEFAULT_GUILD;
   _loc1_.choiceCharacterEnabled = true;
   _loc1_.txtNomPerso.restrict = "A-Za-z\\-";
   _loc1_.txtNomPerso.maxChars = 20;
};
Class_CreateCharacter.prototype = new MovieClip();
Object.registerClass("Interface::CreateCharacter",Class_CreateCharacter);
Class_CreateCharacter.prototype.selectCharacter = function(index)
{
   var _loc1_ = index;
   var _loc2_ = this;
   _loc2_.personnages.dessin.show(_loc1_);
   _loc2_.guildsDescriptions_mc.showDescription(_loc1_);
   _loc2_.mGuild = _loc1_;
};
