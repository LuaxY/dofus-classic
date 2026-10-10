Class_GuildsDescriptions = function()
{
   this.init();
};
Class_GuildsDescriptions.prototype = new MovieClip();
Object.registerClass("Interface::GuildsDescriptions",Class_GuildsDescriptions);
Class_GuildsDescriptions.prototype.init = function()
{
   this.showDescription(1);
};
Class_GuildsDescriptions.prototype.showDescription = function(guildID)
{
   this.createEmptyMovieClip("description_mc",10);
   this.description_mc.loadMovie(GUILDS_DESCRIPTIONS_PATH + guildID + ".swf");
};
