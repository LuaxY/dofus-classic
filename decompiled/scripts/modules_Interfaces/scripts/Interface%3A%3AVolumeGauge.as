Class_VolumeGauge = function()
{
   this.init();
};
Class_VolumeGauge.prototype = new MovieClip();
Object.registerClass("Interface::VolumeGauge",Class_VolumeGauge);
Class_VolumeGauge.prototype.onChange = null;
Class_VolumeGauge.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.setSize(_loc1_._width,_loc1_._height);
   _loc1_.createEmptyMovieClip("Markers",10);
   var m = _loc1_.Markers;
   var divH = _loc1_.maxValue / _loc1_.divisionCount;
   var divW = _loc1_.width / (_loc1_.divisionCount + 1);
   var _loc2_;
   _loc2_ = 0;
   var _loc3_;
   while(_loc2_ <= _loc1_.divisionCount)
   {
      _loc3_ = m.attachMovie("Interface::VolumeGaugeMarker","marker" + _loc2_,_loc2_,{_x:_loc2_ * divW,width:divW,height:_loc1_.height,index:_loc2_,value:_loc2_ * divH,maxValue:_loc1_.maxValue,owner:_loc1_});
      _loc3_.innerOnChangeValue = function()
      {
         this.owner.innerOnChange(this);
      };
      _loc3_.setSkinColor(_loc1_.defaultColor);
      _loc2_ = _loc2_ + 1;
   }
};
Class_VolumeGauge.prototype.setSize = function(w, h)
{
   var _loc1_ = this;
   _loc1_._xscale = _loc1_._yscale = 100;
   _loc1_.width = w;
   _loc1_.height = h;
   _loc1_.deadView_mc.swapDepths(0);
   _loc1_.deadView_mc.removeMovieClip();
};
Class_VolumeGauge.prototype.setValue = function(value)
{
   var _loc1_ = this;
   var _loc2_ = value;
   var _loc3_;
   if(!(_loc2_ < 0 || _loc2_ > _loc1_.maxValue))
   {
      _loc3_ = Math.ceil(_loc1_.divisionCount * _loc2_ / _loc1_.maxValue);
      _loc1_.setMarkersActiveAt(_loc3_);
   }
};
Class_VolumeGauge.prototype.setMarkersActiveAt = function(index)
{
   var _loc2_ = this;
   var _loc1_;
   var _loc3_;
   _loc1_ = 0;
   while(_loc1_ <= index)
   {
      var marker = _loc2_.Markers["marker" + _loc1_];
      marker.setSkinColor(_loc2_.activeColor);
      _loc1_ = _loc1_ + 1;
   }
   _loc3_ = _loc1_;
   while(_loc3_ <= _loc2_.divisionCount)
   {
      var marker = _loc2_.Markers["marker" + _loc3_];
      marker.setSkinColor(_loc2_.defaultColor);
      _loc3_ = _loc3_ + 1;
   }
};
Class_VolumeGauge.prototype.innerOnChange = function(marker)
{
   this.setMarkersActiveAt(marker.index);
   this.onChange(marker.value);
};
