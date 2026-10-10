function FScrollSelectListClass()
{
   this.init();
}; //unpopped
FScrollSelectListClass.prototype = new FSelectableListClass();
FScrollSelectListClass.prototype.getScrollPosition = function()
{
   return this.topDisplayed;
};
FScrollSelectListClass.prototype.setScrollPosition = function(pos)
{
   var _loc1_ = pos;
   var _loc2_ = this;
   if(_loc2_.enable)
   {
      _loc1_ = Math.min(_loc1_,_loc2_.getLength() - _loc2_.numDisplayed);
      _loc1_ = Math.max(_loc1_,0);
      _loc2_.scrollBar_mc.setScrollPosition(_loc1_);
   }
};
FScrollSelectListClass.prototype.setAutoHideScrollBar = function(flag)
{
   var _loc1_ = this;
   _loc1_.permaScrollBar = !flag;
   _loc1_.setSize(_loc1_.width,_loc1_.height);
};
FScrollSelectListClass.prototype.setEnabled = function(enabledFlag)
{
   super.setEnabled(enabledFlag);
   this.scrollBar_mc.setEnabled(this.enable);
};
FScrollSelectListClass.prototype.setSize = function(w, h)
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.getScrollPosition();
   super.setSize(w,h);
   if(_loc1_.scrollBar_mc != undefined)
   {
      _loc1_.removed = true;
   }
   _loc1_.scrollBar_mc = undefined;
   _loc1_.initScrollBar();
   _loc1_.setScrollPosition(_loc2_);
};
FScrollSelectListClass.prototype.modelChanged = function(eventObj)
{
   super.modelChanged(eventObj);
   this.invalidate("initScrollBar");
};
FScrollSelectListClass.prototype.initScrollBar = function()
{
   var _loc1_ = this;
   if(!_loc1_.permaScrollBar && _loc1_.getLength() <= _loc1_.numDisplayed)
   {
      if(_loc1_.removed)
      {
         _loc1_.scrollBar_mc.removeMovieClip();
         _loc1_.scrollBar_mc = undefined;
         _loc1_.scrollOffset = undefined;
         _loc1_.invalidate("setSize");
      }
   }
   else
   {
      if(_loc1_.scrollBar_mc == undefined)
      {
         if(_loc1_.extScrollBar_mc == undefined)
         {
            _loc1_.container_mc.attachMovie("Ank::Dofus::ScrollBar","scrollBar_mc",3000,{hostStyle:_loc1_.styleTable});
            _loc1_.scrollBar_mc = _loc1_.container_mc.scrollBar_mc;
            _loc1_.scrollBar_mc.setSize(_loc1_.height);
            _loc1_.scrollBar_mc._x = _loc1_.popupWidth - _loc1_.scrollBar_mc._width;
            _loc1_.scrollBar_mc._y = 0;
            _loc1_.scrollOffset = _loc1_.scrollBar_mc._width;
            _loc1_.invalidate("setSize");
         }
         else
         {
            _loc1_.container_mc.scrollBar_mc = _loc1_.extScrollBar_mc;
            _loc1_.scrollBar_mc = _loc1_.container_mc.scrollBar_mc;
            _loc1_.scrollOffset = 0;
         }
         _loc1_.scrollBar_mc.setChangeHandler("scrollHandler",_loc1_);
         _loc1_.scrollBar_mc.setLargeScroll(_loc1_.numDisplayed - 1);
         _loc1_.invalidate("setSize");
      }
      _loc1_.scrollBar_mc.setScrollProperties(_loc1_.numDisplayed,0,_loc1_.getLength() - _loc1_.numDisplayed);
   }
};
FScrollSelectListClass.prototype.scrollHandler = function(scrollBar)
{
   var _loc2_ = this;
   var _loc1_ = scrollBar.getScrollPosition();
   _loc2_.topDisplayed = _loc1_;
   if(_loc2_.lastPosition != _loc1_)
   {
      _loc2_.updateControl();
   }
   _loc2_.lastPosition = _loc1_;
};
FScrollSelectListClass.prototype.clickHandler = function(itmNum)
{
   var _loc1_ = this;
   super.clickHandler(itmNum);
   if(_loc1_.dragScrolling == undefined && _loc1_.scrollBar_mc != undefined)
   {
      _loc1_.dragScrolling = setInterval(_loc1_,"dragScroll",15);
   }
};
FScrollSelectListClass.prototype.releaseHandler = function()
{
   clearInterval(this.dragScrolling);
   this.dragScrolling = undefined;
   super.releaseHandler();
};
FScrollSelectListClass.prototype.dragScroll = function()
{
   var _loc1_ = this;
   clearInterval(_loc1_.dragScrolling);
   if(_loc1_.container_mc._ymouse < 0)
   {
      _loc1_.setScrollPosition(_loc1_.getScrollPosition() - 1);
      _loc1_.selectionHandler(0);
      _loc1_.scrollInterval = Math.max(25,-23.8 * (- _loc1_.container_mc._ymouse) + 500);
      _loc1_.dragScrolling = setInterval(_loc1_,"dragScroll",_loc1_.scrollInterval);
   }
   else if(_loc1_.container_mc._ymouse > (_loc1_.itmHgt - 2) * _loc1_.numDisplayed)
   {
      _loc1_.setScrollPosition(_loc1_.getScrollPosition() + 1);
      _loc1_.selectionHandler(_loc1_.numDisplayed - 1);
      _loc1_.scrollInterval = Math.max(25,-23.8 * Math.abs(_loc1_.container_mc._ymouse - (_loc1_.itmHgt - 2) * _loc1_.numDisplayed - 2) + 500);
      _loc1_.dragScrolling = setInterval(_loc1_,"dragScroll",_loc1_.scrollInterval);
   }
   else
   {
      _loc1_.dragScrolling = setInterval(_loc1_,"dragScroll",15);
   }
};
FScrollSelectListClass.prototype.myOnKeyDown = function()
{
   var _loc2_ = this;
   var _loc1_;
   if(_loc2_.focused)
   {
      _loc2_.keyCodes = new Array(40,38,34,33,36,35);
      _loc2_.keyIncrs = new Array(1,-1,_loc2_.numDisplayed - 1,- (_loc2_.numDisplayed - 1),- _loc2_.getLength(),_loc2_.getLength());
      _loc1_ = 0;
      while(true)
      {
         if(_loc1_ >= _loc2_.keyCodes.length)
         {
            _loc2_.findInputText();
            break;
         }
         if(Key.isDown(_loc2_.keyCodes[_loc1_]))
         {
            _loc2_.moveSelBy(_loc2_.keyIncrs[_loc1_]);
            break;
         }
         _loc1_ = _loc1_ + 1;
      }
   }
};
FScrollSelectListClass.prototype.findInputText = function()
{
   var _loc1_ = Key.getAscii();
   if(_loc1_ >= 33 && _loc1_ <= 126)
   {
      this.findString(String.fromCharCode(_loc1_));
   }
};
FScrollSelectListClass.prototype.findString = function(str)
{
   var _loc3_;
   var _loc1_;
   var _loc2_;
   if(this.getLength() != 0)
   {
      _loc3_ = this.getSelectedIndex();
      var jump = 0;
      _loc1_ = _loc3_ + 1;
      while(_loc1_ != _loc3_)
      {
         _loc2_ = this.getItemAt(_loc1_).label.substring(0,str.length);
         if(str == _loc2_ || str.toUpperCase() == _loc2_.toUpperCase())
         {
            var jump = _loc1_ - _loc3_;
            break;
         }
         if(_loc1_ >= this.getLength() - 1)
         {
            _loc1_ = -1;
         }
         _loc1_ = _loc1_ + 1;
      }
      if(jump != 0)
      {
         this.moveSelBy(jump);
      }
   }
};
