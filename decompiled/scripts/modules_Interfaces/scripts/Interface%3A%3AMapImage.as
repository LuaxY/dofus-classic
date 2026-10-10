Class_Interface_MapImage = function()
{
   this.init();
};
Class_Interface_MapImage.prototype = new MovieClip();
Object.registerClass("Interface::MapImage",Class_Interface_MapImage);
Class_Interface_MapImage.prototype.init = function()
{
   this.border.swapDepths(30);
};
Class_Interface_MapImage.prototype.loadMapImage = function(mapID)
{
   var _loc1_ = HTTP_MAPS_PATH + mapID + ".swf";
   this.image.loadMovie(_loc1_);
};
