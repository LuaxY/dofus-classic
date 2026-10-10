Class_boxMessage = function()
{
   this.init();
};
Class_boxMessage.prototype = new MovieClip();
Object.registerClass("boxMessage",Class_boxMessage);
Class_boxMessage.prototype.init = function()
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.params;
   if(_loc1_.params.msg == undefined)
   {
      _loc1_.params.msg = "Impossible";
   }
   _loc1_.message_txt.autoSize = "center";
   _loc1_.message_txt.htmlText = "<p align=\"center\">" + _loc2_.msg + "</p>";
   _loc1_.close_btn._y = _loc1_.message_txt.textHeight + 10;
};
