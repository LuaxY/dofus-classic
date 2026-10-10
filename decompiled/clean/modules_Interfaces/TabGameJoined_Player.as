Class_InterfaceMultiPlayerTabGameJoined_Player = function()
{
   this.init();
};
Class_InterfaceMultiPlayerTabGameJoined_Player.prototype = new MovieClip();
Object.registerClass("TabGameJoined_Player",Class_InterfaceMultiPlayerTabGameJoined_Player);
Class_InterfaceMultiPlayerTabGameJoined_Player.prototype.init = function()
{
   if(!this.bCreator)
   {
      this.btnKill._visible = false;
   }
};
Class_InterfaceMultiPlayerTabGameJoined_Player.prototype.setPlayerName = function(name)
{
   this.txtName.setText(name,"Font3");
};
Class_InterfaceMultiPlayerTabGameJoined_Player.prototype.setPlayerGuild = function(guild)
{
   this.txtGuild.setText(guild,"Font3");
};
Class_InterfaceMultiPlayerTabGameJoined_Player.prototype.setPlayerLevel = function(level)
{
   this.txtLevel.setText(level,"Font3");
};
Class_InterfaceMultiPlayerTabGameJoined_Player.prototype.setPlayerTeam = function(team)
{
   var _loc1_ = this;
   _loc1_.radioTeam0.select(false);
   _loc1_.radioTeam1.select(false);
   _loc1_["radioTeam" + team].select(true);
};
