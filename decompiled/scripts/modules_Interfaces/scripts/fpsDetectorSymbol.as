Class_fpsDetector = function()
{
   this.saveTime = getTimer();
   Stage.addListener(this);
};
Class_fpsDetector.prototype = new MovieClip();
Object.registerClass("fpsDetectorSymbol",Class_fpsDetector);
Class_fpsDetector.prototype.onEnterFrame = function()
{
   var _loc2_ = this;
   var _loc1_ = getTimer() - _loc2_.saveTime;
   _loc2_.fps = Math.round(1 / (_loc1_ / 1000));
   _loc2_.saveTime = getTimer();
};
Class_fpsDetector.prototype.onResize = function()
{
   this._x = 30;
   this._y = 0;
};
