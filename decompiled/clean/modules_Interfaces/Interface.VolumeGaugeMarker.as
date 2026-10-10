Class_VolumeGaugeMarker = function()
{
   this.init();
};
Class_VolumeGaugeMarker.prototype = new MovieClip();
Object.registerClass("Interface::VolumeGaugeMarker",Class_VolumeGaugeMarker);
Class_VolumeGaugeMarker.prototype.innerOnChangeValue = null;
Class_VolumeGaugeMarker.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.trackAsMenu = true;
   _loc1_.attachMovie("GaugeMarkerBack","back",10);
   _loc1_.back._width = _loc1_.width;
   _loc1_.back._height = _loc1_.height;
   _loc1_.attachMovie("GaugeMarkerSkin","skin",20,{_x:1});
   _loc1_.skin._width = _loc1_.width - 2;
   _loc1_.skin._height = _loc1_.height * (_loc1_.value / _loc1_.maxValue);
   _loc1_.skin._y = _loc1_.height - _loc1_.skin._height;
};
Class_VolumeGaugeMarker.prototype.setSkinColor = function(col)
{
   var _loc1_ = new Color(this.skin);
   _loc1_.setRGB(col);
};
Class_VolumeGaugeMarker.prototype.onDragOver = function()
{
   this.innerOnChangeValue();
};
Class_VolumeGaugeMarker.prototype.onPress = function()
{
   this.innerOnChangeValue();
};
