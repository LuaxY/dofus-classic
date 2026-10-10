DialogBubble = function(textAlign)
{
   this.createTextField("txtf",2,0,0,150,0);
   this.rayon = 18;
   this.txt = "";
   this.txtFormat = new TextFormat();
   with(this.txtFormat)
   {
      font = "Font1";
      size = 10;
      align = textAlign;
      bold = false;
      italic = false;
      color = "0x000000";
   }
};
DialogBubble.prototype = new MovieClip();
Object.registerClass("DialogBubbleSymbol",DialogBubble);
DialogBubble.prototype.setText = function(txt)
{
   var _loc1_ = this;
   _loc1_._alpha = 100;
   _loc1_._xscale = _loc1_._yscale = 80;
   _loc1_.onEnterFrame = function()
   {
      var _loc1_ = this;
      _loc1_._xscale = _loc1_._yscale += 25;
      if(_loc1_._xscale > 125)
      {
         _loc1_._xscale = _loc1_._yscale = 100;
         delete _loc1_.onEnterFrame;
      }
   };
   _loc1_.txt = txt;
   _loc1_.drawText(_loc1_.rayon / 2,_loc1_.rayon / 2,_loc1_.txt);
   var _loc2_ = _loc1_.txtf.textHeight > 10 ? _loc1_.txtf.textHeight : 11;
   var _loc3_ = _loc1_.txtf.textWidth > 10 ? _loc1_.txtf.textWidth + 4 : 11;
   _loc1_.drawBubble(_loc3_,_loc2_,_loc1_.rayon);
   _loc1_.bubble._y -= _loc1_.bubble._height;
   _loc1_.txtf._y -= _loc1_.bubble._height;
   clearInterval(_loc1_.intervalID);
   _loc1_.intervalID = setInterval(_loc1_,"remove",5000 + 10 * txt.length);
};
DialogBubble.prototype.drawBubble = function(width, height, rayon)
{
   this.createEmptyMovieClip("bubble",1);
   with(this.bubble)
   {
      lineStyle(1,"0x4B4B4B",100);
      beginFill("0xFFFFCE",100);
      moveTo(rayon,0);
      lineTo(width,0);
      curveTo(width + rayon,0,width + rayon,rayon);
      lineTo(width + rayon,height);
      curveTo(width + rayon,height + rayon,width,height + rayon);
      lineTo(rayon,height + rayon);
      curveTo(0,height + rayon,0,height);
      lineTo(0,rayon);
      curveTo(0,0,rayon,0);
      endFill();
      attachMovie("BubblePic","pic",1,{_x:0,_y:height + rayon + 13});
   }
};
DialogBubble.prototype.drawText = function(x, y, txt)
{
   var _loc1_ = this;
   y -= 2;
   _loc1_.txtf.selectable = false;
   _loc1_.txtf.autoSize = "left";
   _loc1_.txtf.wordWrap = true;
   _loc1_.txtf.setHtmlText(txt);
   _loc1_.txtf.embedFonts = true;
   _loc1_.txtf.setTextFormat(_loc1_.txtFormat);
   _loc1_.txtf._x = x;
   _loc1_.txtf._y = y;
};
DialogBubble.prototype.flipH = function()
{
   var _loc1_ = this;
   _loc1_.txtf._x = _loc1_.bubble._xscale <= 0 ? _loc1_.rayon / 2 : - _loc1_.bubble._width + _loc1_.rayon / 2;
   _loc1_.bubble._xscale *= -1;
};
DialogBubble.prototype.flipV = function()
{
   var _loc1_ = this;
   _loc1_.bubble._yscale *= -1;
   _loc1_.bubble._y = _loc1_.bubble._yscale <= 0 ? _loc1_.bubble._height : - _loc1_.bubble._height;
   _loc1_.txtf._y = _loc1_.bubble._yscale <= 0 ? _loc1_.rayon / 2 + 10 : - _loc1_.bubble._height + (_loc1_.rayon / 2 - 2);
};
DialogBubble.prototype.flipLeft = function()
{
   if(this.bubble._xscale > 0)
   {
      this.flipH();
   }
};
DialogBubble.prototype.flipRight = function()
{
   if(this.bubble._xscale < 0)
   {
      this.flipH();
   }
};
DialogBubble.prototype.flipTop = function()
{
   if(this.bubble._yscale < 0)
   {
      this.flipV();
   }
};
DialogBubble.prototype.flipBottom = function()
{
   if(this.bubble._yscale > 0)
   {
      this.flipV();
   }
};
DialogBubble.prototype.remove = function()
{
   clearInterval(this.intervalID);
   this.removeMovieClip();
};
