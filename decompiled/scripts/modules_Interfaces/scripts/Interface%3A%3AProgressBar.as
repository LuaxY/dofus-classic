Class_Interface_ProgressBar = function()
{
   var _loc1_ = this;
   _loc1_.backColor = 3355443;
   _loc1_.createEmptyMovieClip("bar",1);
   _loc1_.bar.createEmptyMovieClip("back",2);
   _loc1_.bar.createEmptyMovieClip("front",3);
   _loc1_.bar.back.attachMovie("ProgressBar::bar","back",1);
   _loc1_.bar.back.attachMovie("ProgressBar::extremBar","extremL",2);
   _loc1_.bar.back.attachMovie("ProgressBar::extremBar","extremR",3);
   _loc1_.bar.front.attachMovie("ProgressBar::bar","front",1);
   _loc1_.bar.front.attachMovie("ProgressBar::extremBar","extremL",2);
   _loc1_.bar.front.attachMovie("ProgressBar::extremBar","extremR",3);
};
Class_Interface_ProgressBar.prototype = new MovieClip();
Object.registerClass("Interface::ProgressBar",Class_Interface_ProgressBar);
Class_Interface_ProgressBar.prototype.init = function(width, height, x, y, text)
{
   if(text != undefined)
   {
      var tf = new TextFormat();
      tf.color = 16777215;
      tf.font = "Font2";
      tf.italic = true;
      tf.size = 11;
      this.createTextField("txt",2,width / 2,0,0,0);
      var txt = this.txt;
      txt.autoSize = "CENTER";
      txt.selectable = false;
      txt.text = text;
      txt.setTextFormat(tf);
      txt._y = txt.textHeight;
      txt.embedFonts = true;
   }
   this.width = width;
   this.height = height;
   if(x)
   {
      this._x = x - width / 2;
   }
   if(y)
   {
      this._y = y;
   }
   this.drawBack();
   this.drawFront(0);
   with(this.bar.front)
   {
      front._height = this.height;
      extremL._width = this.height / 2;
      extremL._height = this.height;
      extremR._width = this.height / 2;
      extremR._height = this.height;
      extremR._xscale = - extremR._xscale;
   }
};
Class_Interface_ProgressBar.prototype.drawBack = function()
{
   with(this.bar.back)
   {
      var colBack = new Color(back);
      var colExL = new Color(extremL);
      var colExR = new Color(extremR);
      back._width = this.width;
      back._height = this.height;
      colBack.setRGB(this.backColor);
      extremL._width = this.height / 2;
      extremL._height = this.height;
      colExL.setRGB(this.backColor);
      extremR._width = this.height / 2;
      extremR._height = this.height;
      extremR._xscale = - extremR._xscale;
      extremR._x = this.width;
      colExR.setRGB(this.backColor);
   }
};
Class_Interface_ProgressBar.prototype.drawFront = function(value)
{
   var _loc1_ = this;
   var _loc2_ = value;
   if(_loc2_ == 0)
   {
      _loc1_.bar.front._visible = false;
   }
   else
   {
      _loc1_.bar.front._visible = true;
      _loc1_.bar.front.front._width = _loc2_;
      _loc1_.bar.front.extremR._x = _loc2_;
   }
};
Class_Interface_ProgressBar.prototype.update = function(value, max)
{
   var _loc1_ = value;
   var _loc2_ = max;
   if(_loc1_ != undefined)
   {
      if(_loc1_ >= 0)
      {
         if(_loc2_ != undefined)
         {
            if(_loc2_ != 0)
            {
               _loc1_ = Math.ceil(_loc1_ * this.width / _loc2_);
               this.drawFront(_loc1_);
            }
         }
      }
   }
};
