class ank.components.ColorPicker extends MovieClip
{
   var broadcastMessage;
   var colorWidth;
   var colors;
   var gradientColor;
   var height;
   var sliderColors;
   static var COULEURS_V = [16711680,16776960,65280,65535,255,16711935,16711680];
   static var ALPHAS_V = [100,100,100,100,100,100,100];
   static var RAPPORTS_V = [0,42.5,85,127.5,170,212.5,255];
   static var COULEURS_H = [8421504,8421504];
   static var ALPHAS_H = [0,100];
   static var RAPPORTS_H = [0,255];
   static var ALPHASLIDER = [100,100,100];
   static var RAPPORTS_SLIDER = [0,127.5,255];
   function ColorPicker()
   {
      var _loc1_ = this;
      super();
      AsBroadcaster.initialize(_loc1_);
      _loc1_.coefX = 100 / _loc1_._xscale;
      _loc1_.coefY = 100 / _loc1_._yscale;
      _loc1_.borderDisplay = false;
      _loc1_.borderX = 10 * _loc1_.coefX;
      _loc1_.borderY = 10 * _loc1_.coefY;
      _loc1_.sliderWidth = 10 * _loc1_.coefX;
      _loc1_.sliderSpace = 5 * _loc1_.coefX;
      _loc1_.sliderCrossSpace = 8 * _loc1_.coefX;
      _loc1_.sliderCrossSpaceX = 4 * _loc1_.coefX;
      _loc1_.crossWidth = 6 * _loc1_.coefX;
      _loc1_.crossHeight = 6 * _loc1_.coefY;
      _loc1_.crossPointWidth = 3 * _loc1_.coefX;
      _loc1_.crossPointHeight = 3 * _loc1_.coefY;
      _loc1_.sliderCrossWidth = 4 * _loc1_.coefX;
      _loc1_.sliderCrossHeight = 3 * _loc1_.coefY;
      if(!_loc1_.borderDisplay)
      {
         _loc1_.borderX = _loc1_.borderY = 0;
      }
      _loc1_.colorWidth = _loc1_._width * _loc1_.coefX - _loc1_.borderX * 2 - _loc1_.sliderWidth - _loc1_.sliderSpace - _loc1_.sliderCrossSpace;
      _loc1_.height = _loc1_._height * _loc1_.coefY - _loc1_.borderY * 2;
      _loc1_.matriceV = {matrixType:"box",x:0,y:0,w:_loc1_.colorWidth,h:_loc1_.height,r:0};
      _loc1_.matriceH = {matrixType:"box",x:0,y:0,w:_loc1_.colorWidth,h:_loc1_.height,r:1.5707963267948966};
      _loc1_.matriceSlider = {matrixType:"box",x:0,y:0,w:_loc1_.colorWidth,h:_loc1_.height,r:1.5707963267948966};
      _loc1_.draw();
      _loc1_.getGradientColor();
      _loc1_.updateSlider();
   }
   function draw()
   {
      var _loc1_ = this;
      _loc1_.createEmptyMovieClip("colors",10);
      _loc1_.colors.___proto__ = MovieClip.prototype;
      _loc1_.colors._x = _loc1_.borderX;
      _loc1_.colors._y = _loc1_.borderY;
      _loc1_.colors.createEmptyMovieClip("cross",2);
      _loc1_.colors.cross.___proto__ = MovieClip.prototype;
      _loc1_.createEmptyMovieClip("slider",3);
      _loc1_.slider.___proto__ = MovieClip.prototype;
      _loc1_.slider._y = _loc1_.borderY;
      _loc1_.slider._x = _loc1_.colorWidth + _loc1_.borderX + _loc1_.sliderSpace;
      _loc1_.createEmptyMovieClip("sliderColors",2);
      _loc1_.sliderColors.___proto__ = MovieClip.prototype;
      _loc1_.sliderColors._y = _loc1_.borderY;
      _loc1_.sliderColors._x = _loc1_.colorWidth + _loc1_.borderX + _loc1_.sliderSpace;
      _loc1_.sliderColors.createEmptyMovieClip("sliderCross",4);
      _loc1_.sliderCross.___proto__ = MovieClip.prototype;
      _loc1_.sliderColors.sliderCross._x = _loc1_.sliderWidth + _loc1_.sliderCrossSpaceX;
      _loc1_.sliderColors.sliderCross._y = _loc1_.height / 2;
      _loc1_.colors.beginGradientFill("linear",ank.components.ColorPicker.COULEURS_V,ank.components.ColorPicker.ALPHAS_V,ank.components.ColorPicker.RAPPORTS_V,_loc1_.matriceV);
      _loc1_.colors.lineStyle(1,16777215,100);
      _loc1_.colors.moveTo(0,0);
      _loc1_.colors.lineTo(0,_loc1_.height);
      _loc1_.colors.lineTo(_loc1_.colorWidth,_loc1_.height);
      _loc1_.colors.lineTo(_loc1_.colorWidth,0);
      _loc1_.colors.lineTo(0,0);
      _loc1_.colors.endFill();
      _loc1_.colors.beginGradientFill("linear",ank.components.ColorPicker.COULEURS_H,ank.components.ColorPicker.ALPHAS_H,ank.components.ColorPicker.RAPPORTS_H,_loc1_.matriceH);
      _loc1_.colors.moveTo(0,0);
      _loc1_.colors.lineTo(0,_loc1_.height);
      _loc1_.colors.lineTo(_loc1_.colorWidth,_loc1_.height);
      _loc1_.colors.lineTo(_loc1_.colorWidth,0);
      _loc1_.colors.lineTo(0,0);
      _loc1_.colors.endFill();
      _loc1_.colors.lineStyle(0.1,16777215,100);
      _loc1_.colors.moveTo(0,0);
      _loc1_.colors.lineTo(0,_loc1_.height);
      _loc1_.colors.lineTo(_loc1_.colorWidth,_loc1_.height);
      _loc1_.colors.lineTo(_loc1_.colorWidth,0);
      _loc1_.colors.lineTo(0,0);
      _loc1_.colors.cross.lineStyle(0,0,100);
      _loc1_.colors.cross.moveTo(- _loc1_.crossWidth,0);
      _loc1_.colors.cross.lineTo(- _loc1_.crossPointWidth,0);
      _loc1_.colors.cross.moveTo(_loc1_.crossPointWidth,0);
      _loc1_.colors.cross.lineTo(_loc1_.crossWidth,0);
      _loc1_.colors.cross.moveTo(0,- _loc1_.crossHeight);
      _loc1_.colors.cross.lineTo(0,- _loc1_.crossPointHeight);
      _loc1_.colors.cross.moveTo(0,_loc1_.crossPointHeight);
      _loc1_.colors.cross.lineTo(0,_loc1_.crossHeight);
      _loc1_.colors.cross._x = _loc1_.colors._width / 2;
      _loc1_.colors.cross._y = _loc1_.colors._height / 2;
      _loc1_.slider.lineStyle(0.1,16777215,100);
      _loc1_.slider.moveTo(0,0);
      _loc1_.slider.lineTo(0,_loc1_.height);
      _loc1_.slider.lineTo(_loc1_.sliderWidth,_loc1_.height);
      _loc1_.slider.lineTo(_loc1_.sliderWidth,0);
      _loc1_.slider.lineTo(0,0);
      _loc1_.sliderColors.sliderCross.beginFill(0,100);
      _loc1_.sliderColors.sliderCross.moveTo(0,0);
      _loc1_.sliderColors.sliderCross.lineTo(_loc1_.sliderCrossWidth,- _loc1_.sliderCrossHeight);
      _loc1_.sliderColors.sliderCross.lineTo(_loc1_.sliderCrossWidth,_loc1_.sliderCrossHeight);
      _loc1_.sliderColors.sliderCross.lineTo(0,0);
      _loc1_.endFill();
      _loc1_.colors.onPress = _loc1_.onGradientPress;
      _loc1_.colors.onRelease = _loc1_.colors.onReleaseOutside = _loc1_.onGradientRelease;
      _loc1_.sliderColors.onPress = _loc1_.onSliderPress;
      _loc1_.sliderColors.onRelease = _loc1_.sliderColors.onReleaseOutside = _loc1_.onSliderRelease;
   }
   function onGradientPress()
   {
      var _loc1_ = this;
      _loc1_.cross._x = _loc1_._xmouse;
      _loc1_.cross._y = _loc1_._ymouse;
      _loc1_.cross.startDrag(true,0,0,_loc1_._width,_loc1_._height);
      _loc1_.cross.onMouseMove = _loc1_._parent.onGradientDrag;
   }
   function onGradientRelease()
   {
      var _loc1_ = this;
      _loc1_.cross.stopDrag();
      _loc1_.cross.onMouseMove = undefined;
      _loc1_._parent.getGradientColor();
      _loc1_._parent.updateSlider();
      _loc1_._parent.dispatchColorSelect();
   }
   function onGradientDrag()
   {
      this._parent._parent.getGradientColor();
      this._parent._parent.updateSlider();
   }
   function onSliderPress()
   {
      var _loc1_ = this;
      _loc1_.sliderCross.startDrag(true,_loc1_.sliderCross._x,0,_loc1_.sliderCross._x,_loc1_._parent.height);
      _loc1_.sliderCross.onMouseMove = _loc1_._parent.onSliderDrag;
   }
   function onSliderRelease()
   {
      var _loc1_ = this;
      _loc1_.sliderCross.stopDrag();
      _loc1_.sliderCross.onMouseMove = undefined;
      _loc1_._parent.dispatchColorSelect();
   }
   function onSliderDrag()
   {
      this._parent._parent.dispatchColorChange();
   }
   function getCurrentColor()
   {
      var baseColor = this.gradientColor;
      var _loc1_ = 255 - this.sliderColors.sliderCross._y / Math.floor(this.height) * 510;
      var _loc2_;
      var g1;
      var _loc3_;
      var r2;
      var g2;
      var b2;
      var ecart;
      var coef;
      _loc2_ = (baseColor & 0xFF0000) >> 16;
      g1 = (baseColor & 0xFF00) >> 8;
      _loc3_ = baseColor & 0xFF;
      if(_loc1_ >= 0)
      {
         r2 = _loc1_ * (255 - _loc2_) / 255 + _loc2_;
         g2 = _loc1_ * (255 - g1) / 255 + g1;
         b2 = _loc1_ * (255 - _loc3_) / 255 + _loc3_;
      }
      else
      {
         _loc1_ *= -1;
         r2 = Math.round(_loc2_ - _loc2_ * _loc1_ / 255);
         g2 = Math.round(g1 - g1 * _loc1_ / 255);
         b2 = Math.round(_loc3_ - _loc3_ * _loc1_ / 255);
      }
      return Math.round((r2 << 16) + (g2 << 8) + b2);
   }
   function dispatchColorSelect()
   {
      this.broadcastMessage("onColorSelect",this.getCurrentColor());
   }
   function dispatchColorChange()
   {
      this.broadcastMessage("onColorChange",this.getCurrentColor());
   }
   function getGradientColor()
   {
      var _loc1_ = this.colors.cross._x / Math.floor(this.colorWidth);
      var _loc3_ = Math.floor(_loc1_ * (ank.components.ColorPicker.RAPPORTS_V.length - 1));
      _loc1_ *= 255;
      var _loc2_ = 255 - (ank.components.ColorPicker.RAPPORTS_V[_loc3_ + 1] - _loc1_) / (ank.components.ColorPicker.RAPPORTS_V[_loc3_ + 1] - ank.components.ColorPicker.RAPPORTS_V[_loc3_]) * 255;
      var c1 = ank.components.ColorPicker.COULEURS_V[_loc3_];
      var c2 = ank.components.ColorPicker.COULEURS_V[_loc3_ + 1];
      var r1 = c1 & 0xFF0000;
      var g1 = c1 & 0xFF00;
      var b1 = c1 & 0xFF;
      var r2 = c2 & 0xFF0000;
      var g2 = c2 & 0xFF00;
      var b2 = c2 & 0xFF;
      if(r1 != r2)
      {
         var r = Math.round(r1 <= r2 ? _loc2_ : 255 - _loc2_);
      }
      else
      {
         var r = r1 >> 16;
      }
      if(g1 != g2)
      {
         var g = Math.round(g1 <= g2 ? _loc2_ : 255 - _loc2_);
      }
      else
      {
         var g = g1 >> 8;
      }
      if(b1 != b2)
      {
         var b = Math.round(b1 <= b2 ? _loc2_ : 255 - _loc2_);
      }
      else
      {
         var b = b1;
      }
      _loc1_ = this.colors.cross._y / this.height * 255;
      r += (127 - r) * _loc1_ / 255;
      g += (127 - g) * _loc1_ / 255;
      b += (127 - b) * _loc1_ / 255;
      this.gradientColor = (r << 16) + (g << 8) + b;
      return this.gradientColor;
   }
   function updateSlider()
   {
      var _loc1_ = this;
      var _loc2_ = [16777215,_loc1_.gradientColor,0];
      _loc1_.sliderColors.beginGradientFill("linear",_loc2_,ank.components.ColorPicker.ALPHASLIDER,ank.components.ColorPicker.RAPPORTS_SLIDER,_loc1_.matriceSlider);
      _loc1_.sliderColors.moveTo(0,0);
      _loc1_.sliderColors.lineTo(0,_loc1_.height);
      _loc1_.sliderColors.lineTo(_loc1_.sliderWidth,_loc1_.height);
      _loc1_.sliderColors.lineTo(_loc1_.sliderWidth,0);
      _loc1_.sliderColors.lineTo(0,0);
      _loc1_.sliderColors.endFill();
      _loc1_.dispatchColorChange();
   }
}
