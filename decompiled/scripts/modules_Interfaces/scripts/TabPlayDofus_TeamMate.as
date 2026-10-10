Class_TabPlayDofus_TeamMate = function()
{
   this.init();
};
Class_TabPlayDofus_TeamMate.prototype = new Class_TabPlayDofus_TeamMateObject();
Object.registerClass("TabPlayDofus_TeamMate",Class_TabPlayDofus_TeamMate);
Class_TabPlayDofus_TeamMate.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.bWaitingCmp = false;
   _loc1_.btnPlay._visible = false;
   if(_loc1_.id == DATACENTER.Player.ID)
   {
      if(DATACENTER.Game.bYouAreCreator)
      {
         _loc1_.btnPlay._visible = true;
      }
      _loc1_.btnCancel._visible = true;
   }
   else
   {
      _loc1_.btnCancel._visible = DATACENTER.Game.bYouAreCreator;
   }
   var data;
   if(_loc1_.id == 0)
   {
      data = {num:0,name:getText("RANDOM")};
   }
   else
   {
      data = DATACENTER.Characters.getItemAt(_loc1_.id);
      _loc1_.txtExclam._visible = false;
   }
   _loc1_.txtName.setText(data.name,"Font1");
   if(data.level != undefined)
   {
      _loc1_.txtLevel.setText(getText("LEVEL") + " " + data.level,"Font1");
   }
   _loc1_.txtLP.settext(data.LP + " " + getText("LP"),"Font1");
   _loc1_.createEmptyMovieClip("sprite",10);
   _loc1_.sprite._x = 25;
   _loc1_.sprite._y = 113;
   _loc1_.sprite.onInitFrame = function()
   {
      var _loc1_ = this;
      CCOLORS.addCharacter(_loc1_);
      CCOLORS.setColor(_loc1_._target,data.color1,data.color2,data.color3);
      WEAPONS.addCharacter(_loc1_);
      WEAPONS.setData(_loc1_._target,data);
   };
   _loc1_.sprite.loadMovie(data.file);
};
