Class_Window = function()
{
   this.init();
};
Class_Window.prototype = new MovieClip();
Object.registerClass("Interface::Window",Class_Window);
Class_Window.prototype.init = function()
{
   var _loc2_ = this;
   if(_loc2_.owner == undefined)
   {
      _loc2_.owner = _loc2_;
   }
   var _loc3_ = _loc2_.title_mc;
   var _loc1_ = _loc2_.main_mc;
   var c = _loc1_.attachMovie(_loc2_.containerSymbol,"container_mc",10,{owner:_loc2_.owner,params:_loc2_.containerParams});
   var b = c.getBounds();
   var w = b.xMax - b.xMin;
   var h = b.yMax - b.yMin + 10;
   c._x = 10 - b.xMin;
   c._y = 10 - b.yMin;
   _loc3_.middle_mc._x = _loc3_.left_mc._width;
   _loc3_.middle_mc._width = w;
   _loc3_.right_mc._x = _loc3_.left_mc._width + _loc3_.right_mc._width + w;
   var title_txt = _loc3_.title_txt;
   title_txt._x = 10;
   title_txt._y = 5;
   title_txt._width = w;
   title_txt._height = 15;
   _loc3_.onPress = function()
   {
      this._parent.startDrag(false);
   };
   _loc3_.onRelease = _loc3_.onReleaseOutside = function()
   {
      this._parent.stopDrag();
   };
   if(_loc2_.title != undefined)
   {
      title_txt.setText(_loc2_.title,"Font2");
   }
   _loc1_.borderLeft_mc._height = h;
   _loc1_.center_mc._x = _loc1_.borderLeft_mc._width;
   _loc1_.center_mc._width = w;
   _loc1_.center_mc._height = h;
   _loc1_.borderRight_mc._x = _loc1_.borderLeft_mc._width + _loc1_.borderRight_mc._width + w;
   _loc1_.borderRight_mc._height = h;
   _loc1_.cornerLeft_mc._y = h;
   _loc1_.borderBottom_mc._y = h;
   _loc1_.borderBottom_mc._width = w;
   _loc1_.cornerRight_mc._y = h;
   _loc1_.cornerRight_mc._x = _loc1_.borderRight_mc._x;
};
