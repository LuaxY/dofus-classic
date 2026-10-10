function FComboBoxClass()
{
   var _loc1_ = this;
   _global._popUpLevel = _global._popUpLevel != undefined ? _global._popUpLevel + 1 : 20000;
   _loc1_.superHolder = _root.createEmptyMovieClip("superHolder" + _popUpLevel,_popUpLevel);
   var _loc3_ = _loc1_.superHolder.createEmptyMovieClip("testCont",20000);
   var testBox = _loc3_.attachMovie("FBoundingBoxSymbol","boundingBox_mc",0);
   if(testBox._name == undefined)
   {
      _loc1_.superHolder.removeMovieClip();
      _loc1_.superHolder = _loc1_._parent.createEmptyMovieClip("superHolder" + _popUpLevel,_popUpLevel);
   }
   else
   {
      _loc3_.removeMovieClip();
   }
   if(_loc1_.rowCount == undefined)
   {
      _loc1_.rowCount = 8;
      _loc1_.editable = false;
   }
   _loc1_.itemSymbol = "FComboBoxItemSymbol";
   _loc1_.init();
   _loc1_.permaScrollBar = false;
   _loc1_.proxyBox_mc.gotoAndStop(1);
   _loc1_.proxyBox_mc._visible = false;
   _loc1_.width = _loc1_._width;
   _loc1_.height = _loc1_.proxyBox_mc._height * _loc1_._yscale / 100;
   var _loc2_ = 0;
   while(_loc2_ < _loc1_.labels.length)
   {
      _loc1_.addItem(_loc1_.labels[_loc2_],_loc1_.data[_loc2_]);
      _loc2_ = _loc2_ + 1;
   }
   _loc1_.lastSelected = 0;
   _loc1_.selectItem(0);
   _loc1_._xscale = _loc1_._yscale = 100;
   _loc1_.opened = false;
   _loc1_.setSize(_loc1_.width);
   _loc1_.highlightTop(false);
   if(_loc1_.changeHandler.length > 0)
   {
      _loc1_.setChangeHandler(_loc1_.changeHandler);
   }
   _loc1_.onUnload = function()
   {
      this.superHolder.removeMovieClip();
   };
   _loc1_.setSelectedIndex(0,false);
   _loc1_.value = "";
   _loc1_.focusEnabled = true;
   _loc1_.changeFlag = false;
}; //unpopped
FComboBoxClass.prototype = new FScrollSelectListClass();
Object.registerClass("Ank::Dofus::ComboBox",FComboBoxClass);
FComboBoxClass.prototype.modelChanged = function(eventObj)
{
   var _loc1_ = this;
   super.modelChanged(eventObj);
   var _loc2_ = eventObj.event;
   var _loc3_;
   if(_loc2_ == "addRows" || _loc2_ == "deleteRows")
   {
      var diff = eventObj.lastRow - eventObj.firstRow + 1;
      var mode = _loc2_ != "addRows" ? -1 : 1;
      _loc3_ = _loc1_.getLength();
      var lenBefore = _loc3_ - mode * diff;
      if(_loc1_.rowCount > lenBefore || _loc1_.rowCount > _loc3_)
      {
         _loc1_.invalidate("setSize");
      }
      if(_loc1_.getSelectedIndex() == undefined)
      {
         _loc1_.setSelectedIndex(0,false);
      }
   }
   else if(_loc2_ == "updateAll")
   {
      _loc1_.invalidate("setSize");
   }
};
FComboBoxClass.prototype.removeAll = function()
{
   var _loc1_ = this;
   if(_loc1_.enable)
   {
      super.removeAll();
      if(_loc1_.editable)
      {
         _loc1_.value = "";
      }
      _loc1_.invalidate("setSize");
   }
};
FComboBoxClass.prototype.setSize = function(w)
{
   var _loc1_ = this;
   var _loc3_ = w;
   var _loc2_;
   if(!(_loc3_ == undefined || typeof _loc3_ != "number" || _loc3_ <= 0 || !_loc1_.enable))
   {
      _loc1_.container_mc.removeMovieClip();
      _loc1_.itmHgt = 22;
      _loc1_.container_mc = _loc1_.superHolder.createEmptyMovieClip("container",3);
      _loc1_.container_mc.tabChildren = false;
      _loc1_.setPopUpLocation(_loc1_.container_mc);
      _loc1_.container_mc.attachMovie("FBoundingBoxSymbol","boundingBox_mc",0);
      _loc1_.boundingBox_mc = _loc1_.container_mc.boundingBox_mc;
      _loc1_.boundingBox_mc.component = _loc1_;
      _loc1_.registerSkinElement(_loc1_.boundingBox_mc.boundingBox,"background");
      _loc1_.proxyBox_mc._height = _loc1_.itmHgt;
      _loc1_.numDisplayed = Math.min(_loc1_.rowCount,_loc1_.getLength());
      if(_loc1_.numDisplayed < 3)
      {
         _loc1_.numDisplayed = Math.min(3,_loc1_.getLength());
      }
      _loc1_.height = _loc1_.numDisplayed * (_loc1_.itmHgt - 2) + 2;
      super.setSize(_loc3_,_loc1_.height);
      _loc1_.attachMovie("DownArrowComboBox","downArrow",10);
      _loc1_.downArrow._y = 0;
      _loc1_.downArrow._width = _loc1_.itmHgt;
      _loc1_.downArrow._height = _loc1_.itmHgt;
      _loc1_.downArrow._x = _loc3_ - _loc1_.downArrow._width;
      _loc1_.setEditable(_loc1_.editable);
      _loc1_.container_mc._visible = _loc1_.opened;
      _loc1_.highlightTop(false);
      _loc1_.attachMovie("BackgroundComboBox","backGround",1);
      _loc1_.background._y = 0;
      _loc2_ = _loc1_.backGround;
      _loc2_.mc_back_middle._x = _loc2_.mc_back_left._width;
      _loc2_.mc_back_middle._width = _loc3_ - _loc2_.mc_back_left._width - _loc2_.mc_back_right._width;
      _loc2_.mc_back_right._x = _loc2_.mc_back_left._width + _loc2_.mc_back_middle._width;
      _loc1_.popupWidth = _loc3_ - _loc2_.mc_back_left._width - _loc1_.downArrow._width;
      _loc1_.popupX = _loc2_.mc_back_left._width;
      _loc1_.fader = _loc1_.superHolder.attachMovie("FBoundingBoxSymbol","faderX",4);
      _loc1_.registerSkinElement(_loc1_.fader.boundingBox,"background");
      _loc1_.fader._width = _loc1_.popupWidth;
      _loc1_.fader._height = _loc1_.height;
      _loc1_.fader._visible = false;
      _loc1_.proxyBox_mc._width = _loc1_.popupWidth;
      _loc1_.proxyBox_mc._x = _loc1_.popupX;
   }
};
FComboBoxClass.prototype.setDataProvider = function(dp)
{
   super.setDataProvider(dp);
   this.invalidate("setSize");
   this.setSelectedIndex(0);
};
FComboBoxClass.prototype.getValue = function()
{
   if(this.editable)
   {
      return this.fLabel_mc.getLabel();
   }
   return super.getValue();
};
FComboBoxClass.prototype.getRowCount = function()
{
   return this.rowCount;
};
FComboBoxClass.prototype.setRowCount = function(count)
{
   var _loc1_ = this;
   var _loc3_ = count;
   _loc1_.rowCount = _loc1_.getLength() <= _loc3_ ? _loc3_ : Math.max(_loc3_,3);
   _loc1_.setSize(_loc1_.width);
   var _loc2_ = _loc1_.getLength();
   if(_loc2_ - _loc1_.getScrollPosition() < _loc1_.rowCount)
   {
      _loc1_.setScrollPosition(_loc2_ - Math.min(_loc1_.rowCount,_loc2_));
      _loc1_.invalidate("updateControl");
   }
};
FComboBoxClass.prototype.setEditable = function(editableFlag)
{
   var _loc1_ = this;
   if(_loc1_.enable)
   {
      _loc1_.editable = editableFlag;
      if(!_loc1_.editable)
      {
         _loc1_.onPress = _loc1_.pressHandler;
         _loc1_.useHandCursor = false;
         _loc1_.trackAsMenu = true;
         _loc1_.attachMovie("FComboBoxItemSymbol","fLabel_mc",5,{controller:_loc1_,itemNum:-1});
         _loc1_.fLabel_mc.onRollOver = undefined;
         _loc1_.fLabel_mc.setSize(_loc1_.popupWidth,_loc1_.itmHgt);
         _loc1_.topLabel = _loc1_.getSelectedItem();
         _loc1_.fLabel_mc.drawItem(_loc1_.topLabel,false);
         _loc1_.highlightTop(false);
      }
      else
      {
         _loc1_.attachMovie("FLabelSymbol","fLabel_mc",5);
         _loc1_.fLabel_txt = _loc1_.fLabel_mc.labelField;
         _loc1_.fLabel_txt.type = "input";
         _loc1_.fLabel_txt._x = _loc1_.popupX;
         _loc1_.fLabel_txt.onSetFocus = _loc1_.onLabelFocus;
         _loc1_.fLabel_mc.setSize(_loc1_.popupWidth);
         delete _loc1_.onPress;
         _loc1_.fLabel_txt.onKillFocus = function()
         {
            this._parent._parent.myOnKillFocus();
         };
         _loc1_.fLabel_mc.setLabel(_loc1_.value);
         _loc1_.fLabel_mc.setColor(16777215);
         _loc1_.fLabel_txt.onChanged = function()
         {
            this._parent._parent.findInputText();
         };
         _loc1_.downArrow.onPress = _loc1_.buttonPressHandler;
         _loc1_.downArrow.useHandCursor = false;
         _loc1_.downArrow.trackAsMenu = true;
      }
   }
};
FComboBoxClass.prototype.setEnabled = function(enabledFlag)
{
   var _loc1_ = this;
   var _loc2_ = enabledFlag;
   _loc2_ = !(_loc2_ == undefined || typeof _loc2_ != "boolean") ? _loc2_ : true;
   super.setEnabled(_loc2_);
   _loc1_.registerSkinElement(_loc1_.boundingBox_mc.boundingBox,"background");
   _loc1_.proxyBox_mc.gotoAndStop(!_loc1_.enable ? "disabled" : "enabled");
   _loc1_.downArrow.gotoAndStop(!_loc1_.enable ? 3 : 1);
   if(_loc1_.editable)
   {
      _loc1_.fLabel_txt.type = !_loc2_ ? "dynamic" : "input";
      _loc1_.fLabel_txt.selectable = _loc2_;
   }
   else if(_loc2_)
   {
      _loc1_.fLabel_mc.drawItem(_loc1_.topLabel,false);
      _loc1_.setSelectedIndex(_loc1_.getSelectedIndex(),false);
   }
   _loc1_.fLabel_mc.setEnabled(_loc1_.enable);
   _loc1_.fLabel_txt.onSetFocus = !_loc2_ ? undefined : _loc1_.onLabelFocus;
};
FComboBoxClass.prototype.setSelectedIndex = function(index, flag)
{
   var _loc1_ = this;
   super.setSelectedIndex(index,flag);
   if(!_loc1_.editable)
   {
      _loc1_.topLabel = _loc1_.getSelectedItem();
      _loc1_.fLabel_mc.drawItem(_loc1_.topLabel,false);
   }
   else
   {
      _loc1_.value = flag == undefined ? _loc1_.getSelectedItem().label : "";
      _loc1_.fLabel_mc.setLabel(_loc1_.value);
   }
   _loc1_.invalidate("updateControl");
};
FComboBoxClass.prototype.setValue = function(value)
{
   var _loc1_ = this;
   if(_loc1_.editable)
   {
      _loc1_.fLabel_mc.setLabel(value);
      _loc1_.value = value;
   }
};
FComboBoxClass.prototype.pressHandler = function()
{
   var _loc1_ = this;
   _loc1_.focusRect.removeMovieClip();
   if(_loc1_.enable)
   {
      if(!_loc1_.opened)
      {
         _loc1_.onMouseUp = _loc1_.releaseHandler;
      }
      else
      {
         _loc1_.onMouseUp = undefined;
      }
      _loc1_.changeFlag = false;
      if(!_loc1_.focused)
      {
         _loc1_.pressFocus();
         _loc1_.clickFilter = !_loc1_.editable ? true : false;
      }
      if(!_loc1_.clickFilter)
      {
         _loc1_.openOrClose(!_loc1_.opened);
      }
      else
      {
         _loc1_.clickFilter = false;
      }
   }
};
FComboBoxClass.prototype.clickHandler = function(itmNum)
{
   var _loc1_ = this;
   if(!_loc1_.focused)
   {
      if(_loc1_.editable)
      {
         _loc1_.fLabel_txt.onKillFocus = undefined;
      }
      _loc1_.pressFocus();
   }
   super.clickHandler(itmNum);
   _loc1_.selectionHandler(itmNum);
   _loc1_.onMouseUp = _loc1_.releaseHandler;
};
FComboBoxClass.prototype.highlightTop = function(flag)
{
   var _loc1_ = this;
   if(!_loc1_.editable)
   {
      _loc1_.fLabel_mc.drawItem(_loc1_.topLabel,flag);
   }
};
FComboBoxClass.prototype.myOnSetFocus = function()
{
   super.myOnSetFocus();
   this.fLabel_mc.highlight_mc.gotoAndStop("enabled");
   this.highlightTop(true);
};
FComboBoxClass.prototype.drawFocusRect = function()
{
};
FComboBoxClass.prototype.myOnKillFocus = function()
{
   var _loc1_ = this;
   if(Selection.getFocus().indexOf("labelField") == -1)
   {
      super.myOnKillFocus();
      delete _loc1_.fLabel_txt.onKeyDown;
      _loc1_.openOrClose(false);
      _loc1_.highlightTop(false);
   }
};
FComboBoxClass.prototype.setPopUpLocation = function(mcRef)
{
   var _loc1_ = this;
   var _loc3_ = mcRef;
   _loc3_._x = _loc1_._x;
   var _loc2_ = {x:_loc1_._x + _loc1_.background.mc_back_left._width,y:_loc1_._y + _loc1_.proxyBox_mc._height + 2};
   _loc1_._parent.localToGlobal(_loc2_);
   _loc3_._parent.globalToLocal(_loc2_);
   _loc3_._x = _loc2_.x;
   _loc3_._y = _loc2_.y;
   if(_loc1_.height + _loc3_._y >= Stage.height)
   {
      _loc1_.upward = true;
      _loc3_._y = _loc2_.y - _loc1_.height - _loc1_.proxyBox_mc._height;
   }
   else
   {
      _loc1_.upward = false;
   }
};
FComboBoxClass.prototype.openOrClose = function(flag)
{
   var _loc1_ = this;
   var _loc2_ = flag;
   if(_loc1_.getLength() != 0)
   {
      _loc1_.setPopUpLocation(_loc1_.container_mc);
      if(_loc1_.lastSelected != -1 && (_loc1_.lastSelected < _loc1_.topDisplayed || _loc1_.lastSelected > _loc1_.topDisplayed + _loc1_.numDisplayed))
      {
         super.moveSelBy(_loc1_.lastSelected - _loc1_.getSelectedIndex());
      }
      !_loc2_ ? _loc1_.downArrow.gotoAndStop(1) : _loc1_.downArrow.gotoAndStop(2);
      if(_loc2_ != _loc1_.opened)
      {
         _loc1_.highlightTop(!_loc2_);
         _loc1_.fadeRate = _loc1_.styleTable.popUpFade.value;
         if(!_loc2_ || _loc1_.fadeRate == undefined || _loc1_.fadeRate == 0)
         {
            _loc1_.opened = _loc1_.container_mc._visible = _loc2_;
         }
         else
         {
            _loc1_.setPopUpLocation(_loc1_.fader);
            _loc1_.time = 0;
            _loc1_.const = 85 / Math.sqrt(_loc1_.fadeRate);
            _loc1_.fader._alpha = 85;
            _loc1_.container_mc._visible = _loc1_.fader._visible = true;
            _loc1_.onEnterFrame = function()
            {
               var _loc1_ = this;
               _loc1_.fader._alpha = 100 - (_loc1_.const * Math.sqrt(++_loc1_.time) + 15);
               if(_loc1_.time >= _loc1_.fadeRate)
               {
                  _loc1_.fader._visible = false;
                  delete _loc1_.onEnterFrame;
                  _loc1_.opened = true;
               }
            };
         }
      }
   }
};
FComboBoxClass.prototype.fireChange = function()
{
   var _loc1_ = this;
   _loc1_.lastSelected = _loc1_.getSelectedIndex();
   if(!_loc1_.editable)
   {
      _loc1_.topLabel = _loc1_.getSelectedItem();
      _loc1_.fLabel_mc.drawItem(_loc1_.topLabel,true);
   }
   else
   {
      _loc1_.value = _loc1_.getSelectedItem().label;
      _loc1_.fLabel_mc.setLabel(_loc1_.value);
   }
   _loc1_.executeCallback();
};
FComboBoxClass.prototype.releaseHandler = function()
{
   var _loc1_ = this;
   var _loc2_ = _root;
   var _loc3_ = _loc1_.boundingBox_mc.hitTest(_loc2_._xmouse,_loc2_._ymouse);
   if(_loc1_.changeFlag)
   {
      if(_loc3_)
      {
         _loc1_.fireChange();
      }
      _loc1_.openOrClose(!_loc1_.opened);
   }
   else if(_loc3_)
   {
      _loc1_.openOrClose(false);
   }
   else
   {
      _loc1_.onMouseDown = function()
      {
         var _loc1_ = this;
         var _loc2_ = _root;
         if(!_loc1_.boundingBox_mc.hitTest(_loc2_._xmouse,_loc2_._ymouse) && !_loc1_.hitTest(_loc2_._xmouse,_loc2_._ymouse))
         {
            _loc1_.onMouseDown = undefined;
            _loc1_.openOrClose(false);
         }
      };
   }
   _loc1_.changeFlag = false;
   _loc1_.onMouseUp = undefined;
   clearInterval(_loc1_.dragScrolling);
   _loc1_.dragScrolling = undefined;
};
FComboBoxClass.prototype.moveSelBy = function(itemNum)
{
   var _loc1_ = this;
   if(itemNum != 0)
   {
      super.moveSelBy(itemNum);
      if(_loc1_.editable)
      {
         _loc1_.setValue(_loc1_.getSelectedItem().label);
      }
      if(!_loc1_.opened)
      {
         if(_loc1_.changeFlag && !_loc1_.isSelected(_loc1_.lastSelected))
         {
            _loc1_.fireChange();
         }
      }
   }
};
FComboBoxClass.prototype.myOnKeyDown = function()
{
   var _loc1_ = this;
   if(_loc1_.focused)
   {
      if(_loc1_.editable && Key.isDown(13))
      {
         _loc1_.setValue(_loc1_.fLabel_mc.getLabel());
         _loc1_.executeCallback();
         _loc1_.openOrClose(false);
      }
      else if((Key.isDown(13) || Key.isDown(32) && !_loc1_.editable) && _loc1_.opened)
      {
         if(_loc1_.getSelectedIndex() != _loc1_.lastSelected)
         {
            _loc1_.fireChange();
         }
         _loc1_.openOrClose(false);
         _loc1_.fLabel_txt.hscroll = 0;
      }
      super.myOnKeyDown();
   }
};
FComboBoxClass.prototype.findInputText = function()
{
   if(!this.editable)
   {
      super.findInputText();
   }
};
FComboBoxClass.prototype.onLabelFocus = function()
{
   var _loc1_ = this;
   _loc1_._parent._parent.tabFocused = false;
   _loc1_._parent._parent.focused = true;
   _loc1_.onKeyDown = function()
   {
      this._parent._parent.myOnKeyDown();
   };
   Key.addListener(_loc1_);
};
FComboBoxClass.prototype.buttonPressHandler = function()
{
   this._parent.pressHandler();
};
