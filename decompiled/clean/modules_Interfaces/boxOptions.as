Class_boxOptions = function()
{
   this.init();
};
Class_boxOptions.prototype = new MovieClip();
Object.registerClass("boxOptions",Class_boxOptions);
Class_boxOptions.prototype.init = function()
{
   this.music_txt.setText(getText("MUSICS"),"Font1");
   this.sounds_txt.setText(getText("SOUNDS"),"Font1");
};
