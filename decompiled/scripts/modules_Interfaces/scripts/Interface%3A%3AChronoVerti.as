Class_Interface_ChronoVerti = function()
{
   this.init();
};
Class_Interface_ChronoVerti.prototype = new MovieClip();
Object.registerClass("Interface::ChronoVerti",Class_Interface_ChronoVerti);
Class_Interface_ChronoVerti.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.height = _loc1_.RectMask._height;
   _loc1_.stopTimer();
};
Class_Interface_ChronoVerti.prototype.startTimer = function(t)
{
   var _loc1_ = this;
   _loc1_.maxTime = t;
   _loc1_.timerValue = t;
   _loc1_.updateTimer();
   clearInterval(_loc1_.intervalID);
   _loc1_.intervalID = setInterval(_loc1_,"updateTimer",1000);
};
Class_Interface_ChronoVerti.prototype.updateTimer = function()
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.height - _loc1_.timerValue / _loc1_.maxTime * _loc1_.height;
   _loc1_.RectMask._height = _loc2_;
   if(_loc1_.timerValue < 6)
   {
      _loc1_.txtTimer.text = _loc1_.timerValue;
   }
   _loc1_.timerValue = _loc1_.timerValue - 1;
   if(_loc1_.timerValue < 0)
   {
      _loc1_.stopTimer();
   }
};
Class_Interface_ChronoVerti.prototype.stopTimer = function()
{
   var _loc1_ = this;
   _loc1_.RectMask._height = 0;
   _loc1_.txtTimer.text = "";
   clearInterval(_loc1_.intervalID);
};
