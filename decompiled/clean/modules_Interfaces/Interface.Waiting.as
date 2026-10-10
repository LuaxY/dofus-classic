UIWaitingClass = function()
{
};
UIWaitingClass.prototype = new MovieClip();
Object.registerClass("Interface::Waiting",UIWaitingClass);
UIWaitingClass.prototype.open = function()
{
   if(this._currentframe != 6)
   {
      this.gotoAndPlay("open");
   }
};
UIWaitingClass.prototype.close = function()
{
   if(this._currentframe != 1)
   {
      this.gotoAndPlay("close");
   }
};
