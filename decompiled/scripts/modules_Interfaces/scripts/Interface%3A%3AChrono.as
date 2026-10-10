Class_Interface_Chrono = function()
{
   this.init();
};
Class_Interface_Chrono.prototype = new MovieClip();
Object.registerClass("Interface::Chrono",Class_Interface_Chrono);
Class_Interface_Chrono.prototype.init = function()
{
   this.stopTimer();
};
Class_Interface_Chrono.prototype.startTimer = function(t)
{
   var _loc1_ = this;
   _loc1_.maxTime = t;
   _loc1_.timerValue = t;
   _loc1_.updateTimer();
   clearInterval(_loc1_.intervalID);
   _loc1_.intervalID = setInterval(_loc1_,"updateTimer",1000);
   _loc1_._parent.roundMask._visible = false;
};
Class_Interface_Chrono.prototype.updateTimer = function()
{
   var _loc1_ = this;
   var _loc2_ = 360 - _loc1_.timerValue / _loc1_.maxTime * 360;
   if(_loc2_ < 180)
   {
      _loc1_.half1.mask._rotation = _loc2_;
      _loc1_.half2.mask._rotation = 0;
   }
   else
   {
      _loc1_.half1.mask._rotation = 180;
      _loc1_.half2.mask._rotation = _loc2_ - 180;
   }
   if(_loc1_.timerValue <= 5)
   {
      _loc1_.txtTimer.setText(_loc1_.timerValue,"Font2");
      _loc1_.roundMask._visible = true;
   }
   _loc1_.timerValue = _loc1_.timerValue - 1;
   if(_loc1_.timerValue < 0)
   {
      _loc1_.stopTimer();
   }
};
Class_Interface_Chrono.prototype.stopTimer = function()
{
   var _loc1_ = this;
   _loc1_.half1.mask._rotation = 0;
   _loc1_.half2.mask._rotation = 0;
   _loc1_.txtTimer.text = "";
   _loc1_.roundMask._visible = false;
   clearInterval(_loc1_.intervalID);
};
