Class_Interface_NewsScrollerItem = function()
{
   var _loc1_ = this;
   _loc1_.setSize(_loc1_.width,_loc1_.height);
   _loc1_.setText(_loc1_.txt);
};
Class_Interface_NewsScrollerItem.prototype = new MovieClip();
Object.registerClass("Interface::NewsScrollerItem",Class_Interface_NewsScrollerItem);
Class_Interface_NewsScrollerItem.prototype.setText = function()
{
   var _loc1_ = this;
   _loc1_.txtTitle.setText(_loc1_.title,"Font2");
   _loc1_.parseXHTML(_loc1_.newsXML);
};
Class_Interface_NewsScrollerItem.prototype.setSize = function(w, h)
{
   var _loc1_ = this;
   _loc1_.txtView._width = w;
   _loc1_.txtView._height = h - 20;
   _loc1_.txtView.html = true;
};
Class_Interface_NewsScrollerItem.prototype.parseXHTML = function(doc)
{
   var _loc1_ = doc;
   var _loc2_ = "";
   while(_loc1_ != null)
   {
      if(_loc1_.nodeType == 3)
      {
         _loc2_ += _loc1_;
      }
      else if(_loc1_.nodeName !== "a")
      {
         _loc2_ += _loc1_;
      }
      else
      {
         _loc2_ += "<a href=\'" + _loc1_.attributes.href + "\'><u><b><font color=\'#0000FF\'>" + _loc1_.firstChild + "</font></b></u></a>";
      }
      _loc1_ = _loc1_.nextSibling;
   }
   this.txtView.setHtmlText(_loc2_,"Font1");
};
