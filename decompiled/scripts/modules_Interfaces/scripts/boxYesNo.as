Class_boxYesNo = function()
{
   this.init();
};
Class_boxYesNo.prototype = new MovieClip();
Object.registerClass("boxYesNo",Class_boxYesNo);
Class_boxYesNo.prototype.init = function()
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.params;
   _loc1_.question_txt.autoSize = "center";
   _loc1_.question_txt.setText(_loc2_.msg,"Font1");
   _loc1_.yes_btn._y = _loc1_.question_txt.textHeight + 10;
   _loc1_.no_btn._y = _loc1_.question_txt.textHeight + 10;
};
