Class_Sound_Params_Manager = function()
{
   this.init();
};
var proto = Class_Sound_Params_Manager.prototype = new MovieClip();
Object.registerClass("Dofus::Sound::ParamsManager",Class_Sound_Params_Manager);
proto.init = function()
{
   this.params = this.createEmptyMovieClip("params",1);
};
proto.addParams = function(file, volume)
{
   var _loc0_;
   var _loc1_ = this.params[file] = new Object();
   _loc1_.file = file;
   _loc1_.volume = volume;
};
proto.getParams = function(file)
{
   return this.params[file];
};
