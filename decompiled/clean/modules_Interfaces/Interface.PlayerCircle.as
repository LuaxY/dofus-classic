Class_Interface_PlayerCircle = function()
{
   this.init();
};
Class_Interface_PlayerCircle.prototype = new MovieClip();
Object.registerClass("Interface::PlayerCircle",Class_Interface_PlayerCircle);
Class_Interface_PlayerCircle.prototype.init = function()
{
   this.setFace();
};
Class_Interface_PlayerCircle.prototype.setFace = function()
{
   var _loc3_ = this;
   var _loc2_ = DATACENTER.Characters.getItemAt(DATACENTER.Player.ID);
   _loc3_.headClip.loadMovie(GUILDS_FACES_PATH + _loc2_.gfxID + ".swf");
   var _loc1_ = DATACENTER.Player.data;
   CCOLORS.addCharacter(_loc3_.headClip);
   CCOLORS.setColor(_loc3_.headClip._target,_loc1_.color1,_loc1_.color2,_loc1_.color3);
};
Class_Interface_PlayerCircle.prototype.setAnim = function(anim)
{
   trace(this.headClip + " " + anim);
   this.headClip.gotoAndStop(anim);
};
