TextField.prototype.setText = function(text, font, color, size)
{
   var _loc2_ = this;
   var _loc1_ = _loc2_.getTextFormat();
   _loc1_.font = font != undefined ? font : "Font2";
   if(color != undefined)
   {
      _loc1_.color = color;
   }
   if(size != undefined)
   {
      _loc1_.size = size;
   }
   _loc2_.text = text;
   _loc2_.setTextFormat(_loc1_);
   _loc2_.embedFonts = true;
};
