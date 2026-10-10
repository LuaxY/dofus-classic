function FSelectableListClass()
{
   this.init();
}; //unpopped
FSelectableListClass.prototype = new FUIComponentClass();
FSelectableListClass.prototype.init = function()
{
   var _loc1_ = this;
   super.init();
   _loc1_.enable = true;
   _loc1_.selected = new Array();
   _loc1_.topDisplayed = _loc1_.numDisplayed = 0;
   _loc1_.lastSelected = 0;
   _loc1_.tabChildren = false;
   if(_loc1_._name != undefined)
   {
      _loc1_.dataProvider = new DataProviderClass();
      _loc1_.dataProvider.addView(_loc1_);
   }
};
FSelectableListClass.prototype.addItemAt = function(index, label, data)
{
   if(index < 0 || !this.enable)
   {
      return undefined;
   }
   this.dataProvider.addItemAt(index,{label:label,data:data});
};
FSelectableListClass.prototype.addItem = function(label, data)
{
   var _loc1_ = this;
   if(_loc1_.enable)
   {
      if(typeof label == "object")
      {
         label.data = data;
         _loc1_.dataProvider.addItem(label);
      }
      else
      {
         _loc1_.dataProvider.addItem({label:label,data:data});
      }
   }
};
FSelectableListClass.prototype.removeItemAt = function(index)
{
   var _loc1_ = this;
   _loc1_.selectHolder = _loc1_.getSelectedIndex();
   var _loc2_ = _loc1_.getItemAt(index);
   _loc1_.dataProvider.removeItemAt(index);
   return _loc2_;
};
FSelectableListClass.prototype.removeAll = function()
{
   this.dataProvider.removeAll();
};
FSelectableListClass.prototype.replaceItemAt = function(index, newLabel, newData)
{
   this.dataProvider.replaceItemAt(index,{label:newLabel,data:newData});
};
FSelectableListClass.prototype.sortItemsBy = function(fieldName, order)
{
   var _loc1_ = this;
   _loc1_.lastSelID = _loc1_.dataProvider.getItemID(_loc1_.lastSelected);
   _loc1_.dataProvider.sortItemsBy(fieldName,order);
};
FSelectableListClass.prototype.getLength = function()
{
   return this.dataProvider.getLength();
};
FSelectableListClass.prototype.getSelectedIndex = function()
{
   var _loc2_ = this;
   var _loc1_;
   for(var _loc3_ in _loc2_.selected)
   {
      _loc1_ = _loc2_.selected[_loc3_].sIndex;
      if(_loc1_ != undefined)
      {
         return _loc1_;
      }
   }
};
FSelectableListClass.prototype.getSelectedItem = function()
{
   return this.getItemAt(this.getSelectedIndex());
};
FSelectableListClass.prototype.getItemAt = function(index)
{
   return this.dataProvider.getItemAt(index);
};
FSelectableListClass.prototype.getEnabled = function()
{
   return this.enable;
};
FSelectableListClass.prototype.getValue = function()
{
   var _loc1_ = this.getSelectedItem();
   if(_loc1_.data != undefined)
   {
      return _loc1_.data;
   }
   return _loc1_.label;
};
FSelectableListClass.prototype.setSelectedIndex = function(index, flag)
{
   var _loc1_ = this;
   var _loc2_ = index;
   if(_loc2_ >= 0 && _loc2_ < _loc1_.getLength() && _loc1_.enable)
   {
      _loc1_.clearSelected();
      _loc1_.selectItem(_loc2_,true);
      _loc1_.lastSelected = _loc2_;
      _loc1_.invalidate("updateControl");
      if(flag != false)
      {
         _loc1_.executeCallBack();
      }
   }
};
FSelectableListClass.prototype.setDataProvider = function(obj)
{
   var _loc2_ = obj;
   this.setScrollPosition(0);
   this.clearSelected();
   var _loc1_;
   var _loc3_;
   if(_loc2_ instanceof Array)
   {
      this.dataProvider = new DataProviderClass();
      _loc1_ = 0;
      while(_loc1_ < _loc2_.length)
      {
         _loc3_ = typeof _loc2_[_loc1_] != "string" ? _loc2_[_loc1_] : {label:_loc2_[_loc1_]};
         this.dataProvider.addItem(_loc3_);
         _loc1_ = _loc1_ + 1;
      }
   }
   else
   {
      this.dataProvider = _loc2_;
   }
   this.dataProvider.addView(this);
};
FSelectableListClass.prototype.setItemSymbol = function(linkID)
{
   var _loc1_ = this;
   _loc1_.tmpPos = _loc1_.getScrollPosition();
   _loc1_.itemSymbol = linkID;
   _loc1_.invalidate("setSize");
   _loc1_.setScrollPosition(_loc1_.tmpPos);
};
FSelectableListClass.prototype.setEnabled = function(enabledFlag)
{
   var _loc2_ = this;
   _loc2_.cleanUI();
   super.setEnabled(enabledFlag);
   _loc2_.enable = enabledFlag;
   _loc2_.boundingBox_mc.gotoAndStop(!_loc2_.enable ? "disabled" : "enabled");
   var _loc3_ = Math.min(_loc2_.numDisplayed,_loc2_.getLength());
   var _loc1_ = 0;
   while(_loc1_ < _loc3_)
   {
      _loc2_.container_mc["fListItem" + _loc1_ + "_mc"].setEnabled(_loc2_.enable);
      _loc1_ = _loc1_ + 1;
   }
   if(_loc2_.enable)
   {
      _loc2_.invalidate("updateControl");
   }
};
FSelectableListClass.prototype.updateControl = function()
{
   var _loc2_ = this;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.numDisplayed)
   {
      _loc2_.container_mc["fListItem" + _loc1_ + "_mc"].drawItem(_loc2_.getItemAt(_loc2_.topDisplayed + _loc1_),_loc2_.isSelected(_loc2_.topDisplayed + _loc1_));
      _loc1_ = _loc1_ + 1;
   }
};
FSelectableListClass.prototype.setSize = function(w, h)
{
   var _loc1_ = this;
   super.setSize(w,h);
   _loc1_.boundingBox_mc._xscale = _loc1_.boundingBox_mc._yscale = 100;
   _loc1_.boundingBox_mc._xscale = _loc1_.popupWidth * 100 / _loc1_.boundingBox_mc._width;
   _loc1_.boundingBox_mc._yscale = _loc1_.height * 100 / _loc1_.boundingBox_mc._height;
   _loc1_.boundingBox_mc._visible = _loc1_.hideBoundingBox != undefined ? !_loc1_.hideBoundingBox : true;
   var _loc2_ = 0;
   var _loc3_;
   while(_loc2_ < _loc1_.numDisplayed)
   {
      _loc1_.container_mc.attachMovie(_loc1_.itemSymbol,"fListItem" + _loc2_ + "_mc",10 + _loc2_,{controller:_loc1_,itemNum:_loc2_});
      _loc3_ = _loc1_.container_mc["fListItem" + _loc2_ + "_mc"];
      var offset = _loc1_.scrollOffset != undefined ? _loc1_.scrollOffset : 0;
      _loc3_.setSize(_loc1_.popupWidth - offset,_loc1_.itmHgt);
      _loc3_._y = (_loc1_.itmHgt - 1) * _loc2_;
      _loc2_ = _loc2_ + 1;
   }
   _loc1_.updateControl();
};
FSelectableListClass.prototype.modelChanged = function(eventObj)
{
   var _loc1_ = this;
   var firstRow = eventObj.firstRow;
   var lastRow = eventObj.lastRow;
   var event = eventObj.event;
   var _loc2_;
   var _loc3_;
   if(event == "addRows")
   {
      for(var _loc2_ in _loc1_.selected)
      {
         if(_loc1_.selected[_loc2_].sIndex != undefined && _loc1_.selected[_loc2_].sIndex >= firstRow)
         {
            _loc1_.selected[_loc2_].sIndex += lastRow - firstRow + 1;
            _loc1_.setSelectedIndex(_loc1_.selected[_loc2_].sIndex,false);
         }
      }
   }
   else if(event == "deleteRows")
   {
      if(firstRow == lastRow)
      {
         var index = firstRow;
         if(_loc1_.selectHolder == index)
         {
            _loc1_.selectionDeleted = true;
         }
         if(_loc1_.topDisplayed + _loc1_.numDisplayed >= _loc1_.getLength() && _loc1_.topDisplayed > 0)
         {
            _loc1_.topDisplayed = _loc1_.topDisplayed - 1;
            if(_loc1_.selectionDeleted && index - 1 >= 0)
            {
               _loc1_.setSelectedIndex(index - 1,false);
            }
         }
         else if(_loc1_.selectionDeleted)
         {
            var len = _loc1_.getLength();
            if(index == len - 1 && len > 1 || index > len / 2)
            {
               _loc1_.setSelectedIndex(index - 1,false);
            }
            else
            {
               _loc1_.setSelectedIndex(index,false);
            }
         }
         for(_loc2_ in _loc1_.selected)
         {
            if(_loc1_.selected[_loc2_].sIndex > firstRow)
            {
               _loc1_.selected[_loc2_].sIndex--;
            }
         }
      }
      else
      {
         _loc1_.clearSelected();
         _loc1_.topDisplayed = 0;
      }
   }
   else if(event == "sort")
   {
      var len = _loc1_.getLength();
      _loc2_ = 0;
      while(_loc2_ < len)
      {
         if(_loc1_.isSelected(_loc2_))
         {
            _loc3_ = _loc1_.dataProvider.getItemID(_loc2_);
            if(_loc3_ == _loc1_.lastSelID)
            {
               _loc1_.lastSelected = _loc2_;
            }
            _loc1_.selected[String(_loc3_)].sIndex = _loc2_;
         }
         _loc2_ = _loc2_ + 1;
      }
   }
   _loc1_.invalidate("updateControl");
};
FSelectableListClass.prototype.measureItmHgt = function()
{
   var _loc1_ = this;
   _loc1_.attachMovie(_loc1_.itemSymbol,"tmpItem_mc",0,{controller:_loc1_});
   _loc1_.tmpItem_mc.drawItem({label:"Sizer: PjtTopg"},false);
   _loc1_.itmHgt = Math.floor(_loc1_.tmpItem_mc._height);
   _loc1_.tmpItem_mc.removeMovieClip();
};
FSelectableListClass.prototype.selectItem = function(index, selectedFlag)
{
   var _loc1_ = this;
   var _loc2_ = index;
   if(selectedFlag && !_loc1_.isSelected(_loc2_))
   {
      _loc1_.selected[String(_loc1_.dataProvider.getItemID(_loc2_))] = {sIndex:_loc2_};
   }
   else if(!selectedFlag)
   {
      delete _loc1_.selected[String(_loc1_.dataProvider.getItemID(_loc2_))];
   }
};
FSelectableListClass.prototype.isSelected = function(index)
{
   return this.selected[String(this.dataProvider.getItemID(index))].sIndex != undefined;
};
FSelectableListClass.prototype.clearSelected = function()
{
   var _loc1_ = this;
   var _loc2_;
   for(var _loc3_ in _loc1_.selected)
   {
      _loc2_ = _loc1_.selected[_loc3_].sIndex;
      if(_loc2_ != undefined && _loc1_.topDisplayed <= _loc2_ && _loc2_ < _loc1_.topDisplayed + _loc1_.numDisplayed)
      {
         _loc1_.container_mc["fListItem" + (_loc2_ - _loc1_.topDisplayed) + "_mc"].drawItem(_loc1_.getItemAt(_loc2_),false);
      }
   }
   delete _loc1_.selected;
   _loc1_.selected = new Array();
};
FSelectableListClass.prototype.selectionHandler = function(itemNum)
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.topDisplayed + itemNum;
   if(_loc1_.getItemAt(_loc2_ == undefined))
   {
      _loc1_.changeFlag = false;
   }
   else
   {
      _loc1_.changeFlag = true;
      _loc1_.clearSelected();
      _loc1_.selectItem(_loc2_,true);
      _loc1_.container_mc["fListItem" + itemNum + "_mc"].drawItem(_loc1_.getItemAt(_loc2_),_loc1_.isSelected(_loc2_));
   }
};
FSelectableListClass.prototype.moveSelBy = function(incr)
{
   var _loc1_ = this;
   var _loc3_ = _loc1_.getSelectedIndex();
   var _loc2_ = _loc3_ + incr;
   _loc2_ = Math.max(0,_loc2_);
   _loc2_ = Math.min(_loc1_.getLength() - 1,_loc2_);
   if(_loc2_ != _loc3_)
   {
      if(_loc3_ < _loc1_.topDisplayed || _loc3_ >= _loc1_.topDisplayed + _loc1_.numDisplayed)
      {
         _loc1_.setScrollPosition(_loc3_);
      }
      if(_loc2_ >= _loc1_.topDisplayed + _loc1_.numDisplayed || _loc2_ < _loc1_.topDisplayed)
      {
         _loc1_.setScrollPosition(_loc1_.topDisplayed + incr);
      }
      _loc1_.selectionHandler(_loc2_ - _loc1_.topDisplayed);
   }
};
FSelectableListClass.prototype.clickHandler = function(itmNum)
{
   var _loc1_ = this;
   _loc1_.focusRect.removeMovieClip();
   if(!_loc1_.focused)
   {
      _loc1_.pressFocus();
   }
   _loc1_.selectionHandler(itmNum);
   _loc1_.onMouseUp = _loc1_.releaseHandler;
};
FSelectableListClass.prototype.releaseHandler = function()
{
   var _loc1_ = this;
   if(_loc1_.changeFlag)
   {
      if(getTimer() - _loc1_.__lastClick__ < 400)
      {
         _loc1_.onDblClick();
      }
      else
      {
         _loc1_.onClick();
      }
      _loc1_.__lastClick__ = getTimer();
      _loc1_.executeCallBack();
   }
   _loc1_.changeFlag = false;
   _loc1_.onMouseUp = undefined;
};
FSelectableListClass.prototype.myOnSetFocus = function()
{
   var _loc2_ = this;
   super.myOnSetFocus();
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.numDisplayed)
   {
      _loc2_.container_mc["fListItem" + _loc1_ + "_mc"].highlight_mc.gotoAndStop("enabled");
      _loc1_ = _loc1_ + 1;
   }
};
FSelectableListClass.prototype.myOnKillFocus = function()
{
   var _loc2_ = this;
   super.myOnKillFocus();
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.numDisplayed)
   {
      _loc2_.container_mc["fListItem" + _loc1_ + "_mc"].highlight_mc.gotoAndStop("unfocused");
      _loc1_ = _loc1_ + 1;
   }
};
