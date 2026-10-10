Class_ToolTip = function()
{
   this.visible = false;
};
Class_ToolTip.prototype = new MovieClip();
Object.registerClass("Interface::ToolTip",Class_ToolTip);
Class_ToolTip.prototype.setText = function(text, x, y, bMouseOrigine, bCenter, interval, bTopAlign)
{
   var _loc1_ = this;
   var _loc3_ = bTopAlign;
   if(_loc3_ == undefinec)
   {
      _loc3_ = false;
   }
   if(interval == undefined)
   {
      interval = 300;
   }
   var _loc2_ = _loc1_.txt;
   _loc2_.autoSize = true;
   _loc2_.setHtmlText(text,"Font3");
   _loc1_.lineStyle(1,2236962);
   _loc1_.beginFill(13918,80);
   _loc1_.moveTo(-1,0);
   _loc1_.lineTo(_loc2_.textWidth + 4,0);
   _loc1_.lineTo(_loc2_.textWidth + 4,_loc2_.textHeight + 2);
   _loc1_.lineTo(-1,_loc2_.textHeight + 2);
   _loc1_.lineTo(-1,0);
   _loc1_.endFill();
   if(!_loc3_)
   {
      _loc1_._x = !bMouseOrigine ? - _loc2_.textWidth + x : _root._xmouse - _loc2_.textWidth + x;
   }
   else
   {
      _loc1_._x = !bMouseOrigine ? x : _root._xmouse + x;
   }
   if(bCenter)
   {
      if(!_loc3_)
      {
         _loc1_._x += _loc2_.textWidth / 2;
      }
      else
      {
         _loc1_._x -= _loc2_.textWidth / 2;
      }
   }
   if(!_loc3_)
   {
      _loc1_._y = !bMouseOrigine ? - _loc2_.textHeight + y : _root._ymouse - _loc2_.textHeight + y;
   }
   else
   {
      _loc1_._y = !bMouseOrigine ? y : _root._ymouse + y;
   }
   if(bMouseOrigine)
   {
      _loc1_.startDrag(false);
   }
   _loc1_._x = Math.ceil(_loc1_._x);
   _loc1_._y = Math.ceil(_loc1_._y);
   _loc1_.visible = true;
   _loc1_._visible = false;
   _loc1_.timer = getTimer();
   _loc1_.onEnterFrame = function()
   {
      var _loc1_ = this;
      if(getTimer() - _loc1_.timer > interval)
      {
         _loc1_._visible = true;
         delete _loc1_.onEnterFrame;
      }
   };
};
