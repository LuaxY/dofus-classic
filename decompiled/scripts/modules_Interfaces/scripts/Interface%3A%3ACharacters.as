Class_Characters = function()
{
   this.init();
};
Class_Characters.prototype = new MovieClip();
Object.registerClass("Interface::Characters",Class_Characters);
Class_Characters.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.CHOICEX = 0;
   _loc1_.CHOICEY = 181;
   _loc1_.CHOICEXSPACING = 149;
   _loc1_.CHOICEYSPACING = 115;
   _loc1_.onEnterFrame = function()
   {
      var _loc1_ = this;
      _loc1_.btnCreate.setLabel(getText("CREATE"));
      _loc1_.btnDelete.setLabel(getText("DELETE"));
      _loc1_.btnPlay.setLabel(getText("PLAY"));
      _loc1_.title_txt.setText(getText("CHOOSE_TITLE"));
      delete _loc1_.onEnterFrame;
   };
};
Class_Characters.prototype.onSelectCharacter = function(index, characData)
{
   var _loc1_ = this;
   _loc1_.selectedcharacterID = characData.id;
   _loc1_.selectedcharacterData = characData;
   _loc1_["choice" + _loc1_.selectedCharacter].select(false);
   _loc1_.selectedCharacter = index;
   _loc1_["choice" + index].select(true);
};
Class_Characters.prototype.setCharacters = function(characArray)
{
   var _loc3_ = characArray;
   var _loc1_;
   var _loc2_;
   var characCount = 0;
   _loc1_ = 0;
   while(_loc1_ < 10)
   {
      if(_loc1_ < _loc3_.length)
      {
         this.attachMovie("Interface::Characters::Choice","choice" + _loc1_,_loc1_ + 1);
         _loc2_ = this["choice" + _loc1_];
         _loc2_.createEmptyMovieClip("perso",10);
         _loc2_.perso.loadMovie(_loc3_[_loc1_].file,10);
         _loc2_.perso._y = 60;
         _loc2_.perso._x = 75;
         _loc2_.name = _loc3_[_loc1_].name;
         _loc2_.level = getText("LEVEL") + " " + _loc3_[_loc1_].level;
         _loc2_._data = _loc3_[_loc1_];
         _loc2_.id = _loc3_[_loc1_].id;
         _loc2_.index = _loc1_;
         CCOLORS.addCharacter(_loc2_.perso);
         CCOLORS.setColor(_loc2_.perso._target,_loc3_[_loc1_].color1,_loc3_[_loc1_].color2,_loc3_[_loc1_].color3);
         WEAPONS.addCharacter(_loc2_.perso);
         WEAPONS.setData(_loc2_.perso._target,_loc3_[_loc1_]);
         characCount++;
      }
      else
      {
         this.attachMovie("Interface::Characters::Empty","choice" + _loc1_,_loc1_ + 1);
         _loc2_ = this["choice" + _loc1_];
      }
      _loc2_._x = this.CHOICEX + this.CHOICEXSPACING * (_loc1_ % 5);
      _loc2_._y = this.CHOICEY + this.CHOICEYSPACING * Math.floor(_loc1_ / 5);
      _loc1_ = _loc1_ + 1;
   }
   if(characCount >= 10)
   {
      this.btnAdd.setEnabled(false);
   }
};
