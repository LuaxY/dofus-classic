Class_GuildsArtworkMini = function()
{
   this.init();
};
Class_GuildsArtworkMini.prototype = new MovieClip();
Object.registerClass("Interface::GuildsArtworkMini",Class_GuildsArtworkMini);
Class_GuildsArtworkMini.prototype.init = function()
{
   this.show(this.guildID);
};
Class_GuildsArtworkMini.prototype.show = function(guildID)
{
   this.createEmptyMovieClip("mini_mc",10);
   this.mini_mc.loadMovie(GUILDS_MINI_PATH + guildID + ".swf");
};
