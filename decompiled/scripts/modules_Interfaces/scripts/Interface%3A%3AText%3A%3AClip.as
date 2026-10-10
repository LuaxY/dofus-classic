Class_InterfaceTextClip = function()
{
   var _loc1_ = this;
   _loc1_.setText(_loc1_.text,_loc1_.color);
};
Class_InterfaceTextClip.prototype = new MovieClip();
Object.registerClass("Interface::Text::Clip",Class_InterfaceTextClip);
Class_InterfaceTextClip.prototype.setText = function(text, color)
{
   var _loc2_ = new TextFormat();
   _loc2_.color = color;
   _loc2_.font = "Font2";
   _loc2_.size = 15;
   _loc2_.align = "center";
   this.createTextField("txt",1,0,0,0,0);
   var _loc1_ = this.txt;
   _loc1_.autoSize = "CENTER";
   _loc1_.selectable = false;
   _loc1_.multiline = true;
   _loc1_.text = text;
   _loc1_.setTextFormat(_loc2_);
   _loc1_.embedFonts = true;
};
