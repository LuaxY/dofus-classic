Class_InterfaceCursor = function()
{
   this.init(this.iconFile);
};
Class_InterfaceCursor.prototype = new MovieClip();
Object.registerClass("Interface::Cursor",Class_InterfaceCursor);
Class_InterfaceCursor.prototype.init = function(iconFile)
{
   var _loc1_ = this;
   _loc1_.createEmptyMovieClip("icon",1);
   var _loc2_ = _loc1_.icon;
   _loc2_._x = 10;
   _loc2_._y = 20;
   _loc2_._xscale = _loc2_._yscale = 50;
   _loc2_.onInitFrame = function()
   {
      var _loc1_ = this;
      _loc1_._parent.startDrag(true);
      _loc1_._parent.onMouseUp = function()
      {
         this.onClearCursor();
         INTERFACE.setCursor(null);
         delete this.onMouseUp;
      };
      Mouse.addListener(_loc1_._parent);
   };
   _loc2_.loadMovie(iconFile);
   _loc1_.setForbidden(true);
};
Class_InterfaceCursor.prototype.setForbidden = function(bool)
{
   if(bool)
   {
      this.attachMovie("forbidden","forbidden",2,{_x:20,_y:30});
   }
   else
   {
      this.forbidden.removeMovieClip();
   }
};
