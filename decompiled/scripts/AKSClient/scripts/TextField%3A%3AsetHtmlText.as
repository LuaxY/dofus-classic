TextField.prototype.setHtmlText = function(text, font)
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.getTextFormat();
   _loc2_.font = font != undefined ? font : "Font2";
   _loc1_.html = true;
   _loc1_.htmlText = text;
   _loc1_.setTextFormat(_loc2_);
   _loc1_.embedFonts = true;
};
