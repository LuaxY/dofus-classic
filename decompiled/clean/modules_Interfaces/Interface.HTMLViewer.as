Class_Interface_HTMLViewer = function()
{
   var _loc1_ = this;
   _loc1_.setSize(_loc1_._width,_loc1_._height);
};
Class_Interface_HTMLViewer.prototype = new MovieClip();
Object.registerClass("Interface::HTMLViewer",Class_Interface_HTMLViewer);
Class_Interface_HTMLViewer.prototype.setSize = function(w, h)
{
   var _loc1_ = this;
   _loc1_._xscale = _loc1_._yscale = 100;
   _loc1_.attachMovie("Ank::Dofus::ScrollBar","scrollBar",20,{thumbPointer:true});
   _loc1_.txtView._width = w - _loc1_.scrollBar._width;
   _loc1_.txtView._height = h;
   _loc1_.txtView.html = true;
   _loc1_.scrollBar._x = w - _loc1_.scrollBar._width;
   _loc1_.scrollBar.setSize(h);
   _loc1_.scrollBar.setScrollTarget(_loc1_.txtView);
   _loc1_.deadView._visible = false;
};
Class_Interface_HTMLViewer.prototype.loadXHML = function(file)
{
   var _loc2_ = this;
   var _loc1_ = new XML();
   _loc1_.ignoreWhite = true;
   _loc1_.parent = _loc2_;
   _loc1_.onLoad = function(success)
   {
      if(success)
      {
         this.parent.parseXHTML(this);
      }
      else
      {
         INTERFACE.msgBox("Impossible d\'ouvrir le fichier");
      }
   };
   _loc1_.load(file);
};
Class_Interface_HTMLViewer.prototype.parseXHTML = function(doc)
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
   this.txtView.htmlText = _loc2_;
};
Class_Interface_HTMLViewer.prototype.clear = function()
{
   this.txtView.htmlText = "";
};
