var UI = _parent._parent._parent;
this.createEmptyMovieClip("clip_mc",10);
this.clip_mc.loadMovie(dofus.Constants.CLIPS_PERSOS_PATH + UI.guildID.toString() + UI.sex.toString() + ".swf");
var c = UI.colors;
CCOLORS.addCharacter(this.clip_mc);
CCOLORS.setColor(this.clip_mc._target,c[1],c[2],c[3]);
WEAPONS.addCharacter(this.clip_mc);
WEAPONS.setData(this.clip_mc._target,{weaponID:10});
this.clip_mc.onInitFrame = function()
{
   this.gotoAndStop("WaitR");
};
