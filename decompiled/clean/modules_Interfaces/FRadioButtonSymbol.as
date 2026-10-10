function FRadioButtonClass()
{
   this.init();
}; //unpopped
function FRadioButtonGroupClass()
{
   this.radioInstances = new Array();
}; //unpopped
FRadioButtonClass.prototype = new FUIComponentClass();
FRadioButtonGroupClass.prototype = new FUIComponentClass();
Object.registerClass("FRadioButtonSymbol",FRadioButtonClass);
FRadioButtonClass.prototype.init = function()
{
   var _loc1_ = this;
   if(_loc1_.initialState == undefined)
   {
      _loc1_.selected = false;
   }
   else
   {
      _loc1_.selected = _loc1_.initialState;
   }
   super.setSize(_loc1_._width,_loc1_._height);
   _loc1_.boundingBox_mc.unloadMovie();
   _loc1_.boundingBox_mc._width = 0;
   _loc1_.boundingBox_mc._height = 0;
   _loc1_.attachMovie("frb_hitArea","frb_hitArea_mc",1);
   _loc1_.attachMovie("frb_states","frb_states_mc",2);
   _loc1_.attachMovie("FLabelSymbol","fLabel_mc",3);
   super.init();
   _loc1_._xscale = 100;
   _loc1_._yscale = 100;
   _loc1_.setSize(_loc1_.width,_loc1_.height);
   _loc1_.setChangeHandler(_loc1_.changeHandler);
   if(_loc1_.label != undefined)
   {
      _loc1_.setLabel(_loc1_.label);
   }
   if(_loc1_.initialState == undefined)
   {
      _loc1_.setValue(false);
   }
   else
   {
      _loc1_.setValue(_loc1_.initialState);
   }
   if(_loc1_.data == "")
   {
      _loc1_.data = undefined;
   }
   else
   {
      _loc1_.setData(_loc1_.data);
   }
   _loc1_.addToRadioGroup();
   _loc1_.ROLE_SYSTEM_RADIOBUTTON = 45;
   _loc1_.STATE_SYSTEM_SELECTED = 16;
   _loc1_.EVENT_OBJECT_STATECHANGE = 32778;
   _loc1_.EVENT_OBJECT_NAMECHANGE = 32780;
   _loc1_._accImpl.master = _loc1_;
   _loc1_._accImpl.stub = false;
   _loc1_._accImpl.get_accRole = _loc1_.get_accRole;
   _loc1_._accImpl.get_accName = _loc1_.get_accName;
   _loc1_._accImpl.get_accState = _loc1_.get_accState;
   _loc1_._accImpl.get_accDefaultAction = _loc1_.get_accDefaultAction;
   _loc1_._accImpl.accDoDefaultAction = _loc1_.accDoDefaultAction;
};
FRadioButtonClass.prototype.setHitArea = function(w, h)
{
   var _loc2_ = this;
   var _loc1_ = _loc2_.frb_hitArea_mc;
   _loc2_.hitArea = _loc1_;
   if(_loc2_.frb_states_mc._width > w)
   {
      _loc1_._width = _loc2_.frb_states_mc._width;
   }
   else
   {
      _loc1_._width = w;
   }
   _loc1_._visible = false;
   if(arguments.length > 1)
   {
      _loc1_._height = h;
   }
};
FRadioButtonClass.prototype.txtFormat = function(pos)
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.textStyle;
   var _loc3_ = _loc1_.styleTable;
   _loc2_.align = _loc3_.textAlign.value != undefined ? undefined : (_loc2_.align = pos);
   _loc2_.leftMargin = _loc3_.textLeftMargin.value != undefined ? undefined : (_loc2_.leftMargin = 0);
   _loc2_.rightMargin = _loc3_.textRightMargin.value != undefined ? undefined : (_loc2_.rightMargin = 0);
   if(_loc1_.flabel_mc._height > _loc1_.height)
   {
      super.setSize(_loc1_.width,_loc1_.flabel_mc._height);
   }
   else
   {
      super.setSize(_loc1_.width,_loc1_.height);
   }
   _loc1_.setEnabled(_loc1_.enable);
};
FRadioButtonClass.prototype.setSize = function(w, h)
{
   var _loc1_ = this;
   _loc1_.setLabel(_loc1_.getLabel());
   _loc1_.setLabelPlacement(_loc1_.labelPlacement);
   if(_loc1_.frb_states_mc._height < _loc1_.flabel_mc.labelField._height)
   {
      super.setSize(w,_loc1_.flabel_mc.labelField._height);
   }
   _loc1_.setHitArea(_loc1_.width,_loc1_.height);
   _loc1_.setLabelPlacement(_loc1_.labelPlacement);
};
FRadioButtonClass.prototype.setLabelPlacement = function(pos)
{
   var _loc1_ = this;
   _loc1_.setLabel(_loc1_.getLabel());
   _loc1_.txtFormat(pos);
   var halfLabelH = _loc1_.fLabel_mc._height / 2;
   var halfFrameH = _loc1_.frb_states_mc._height / 2;
   var vertCenter = halfFrameH - halfLabelH;
   var radioWidth = _loc1_.frb_states_mc._width;
   var _loc2_ = _loc1_.frb_states_mc;
   var label = _loc1_.fLabel_mc;
   var _loc3_ = _loc1_.width - _loc2_._width;
   if(_loc2_._width > _loc1_.width)
   {
      _loc3_ = 0;
   }
   else
   {
      _loc3_ = _loc1_.width - _loc2_._width;
   }
   _loc1_.fLabel_mc.setSize(_loc3_);
   if(pos == "right" || pos == undefined)
   {
      _loc1_.labelPlacement = "right";
      _loc1_.frb_states_mc._x = 0;
      _loc1_.fLabel_mc._x = radioWidth;
      _loc1_.txtFormat("left");
   }
   else if(pos == "left")
   {
      _loc1_.labelPlacement = "left";
      _loc1_.fLabel_mc._x = 0;
      _loc1_.frb_states_mc._x = _loc1_.width - radioWidth;
      _loc1_.txtFormat("right");
   }
   _loc1_.fLabel_mc._y = vertCenter;
   _loc1_.frb_hitArea_mc._y = vertCenter;
   _loc1_.setLabel(_loc1_.getLabel());
};
FRadioButtonClass.prototype.setData = function(dataValue)
{
   this.data = dataValue;
};
FRadioButtonClass.prototype.getData = function()
{
   return this.data;
};
FRadioButtonClass.prototype.getState = function()
{
   return this.selected;
};
FRadioButtonClass.prototype.getSize = function()
{
   return this.width;
};
FRadioButtonClass.prototype.getGroupName = function()
{
   return this.groupName;
};
FRadioButtonClass.prototype.setGroupName = function(groupName)
{
   var _loc1_ = this;
   var _loc2_ = 0;
   while(_loc2_ < _loc1_._parent[_loc1_.groupName].radioInstances.length)
   {
      if(_loc1_._parent[_loc1_.groupName].radioInstances[_loc2_] == _loc1_)
      {
         delete _loc1_._parent[_loc1_.groupName].radioInstances[_loc2_];
      }
      _loc2_ = _loc2_ + 1;
   }
   _loc1_.groupName = groupName;
   _loc1_.addToRadioGroup();
};
FRadioButtonClass.prototype.addToRadioGroup = function()
{
   var _loc1_ = this;
   if(_loc1_._parent[_loc1_.groupName] == undefined)
   {
      _loc1_._parent[_loc1_.groupName] = new FRadioButtonGroupClass();
   }
   _loc1_._parent[_loc1_.groupName].addRadioInstance(_loc1_);
};
FRadioButtonClass.prototype.setValue = function(selected)
{
   var _loc1_ = this;
   var _loc2_ = selected;
   if(_loc2_ || _loc2_ == undefined)
   {
      _loc1_.setState(true);
      _loc1_.focusRect.removeMovieClip();
      _loc1_.executeCallBack();
   }
   else if(_loc2_ == false)
   {
      _loc1_.setState(false);
   }
};
FRadioButtonClass.prototype.setTabState = function(selected)
{
   var _loc1_ = this;
   Selection.setFocus(_loc1_);
   _loc1_.setState(selected);
   _loc1_.drawFocusRect();
   _loc1_.executeCallBack();
};
FRadioButtonClass.prototype.setState = function(selected)
{
   var _loc1_ = this;
   var _loc2_ = selected;
   trace(_loc1_);
   trace(_loc2_);
   if(_loc2_ || _loc2_ == undefined)
   {
      _loc1_.tabEnabled = true;
      for(var _loc3_ in _loc1_._parent)
      {
         if(_loc1_ != _loc1_._parent[_loc3_] && _loc1_._parent[_loc3_].groupName == _loc1_.groupName)
         {
            _loc1_._parent[_loc3_].setState(false);
            _loc1_._parent[_loc3_].tabEnabled = false;
         }
      }
   }
   if(_loc1_.enable)
   {
      _loc1_.flabel_mc.setEnabled(true);
      if(_loc2_ || _loc2_ == undefined)
      {
         _loc1_.frb_states_mc.gotoAndStop("selectedEnabled");
         _loc1_.enabled = false;
         _loc1_.selected = true;
         _loc1_.tabEnabled = true;
         _loc1_.tabFocused = true;
      }
      else
      {
         _loc1_.frb_states_mc.gotoAndStop("unselectedEnabled");
         _loc1_.enabled = true;
         _loc1_.selected = false;
         _loc1_.tabEnabled = false;
         var enabTrue = _loc1_._parent[_loc1_.groupName].getEnabled();
         var noneSelect = _loc1_._parent[_loc1_.groupName].getValue() == undefined;
         if(enabTrue && noneSelect)
         {
            _loc1_._parent[_loc1_.groupName].radioInstances[0].tabEnabled = true;
         }
      }
   }
   else
   {
      _loc1_.flabel_mc.setEnabled(false);
      if(_loc2_ || _loc2_ == undefined)
      {
         _loc1_.frb_states_mc.gotoAndStop("selectedDisabled");
         _loc1_.enabled = false;
         _loc1_.selected = true;
         _loc1_.tabEnabled = false;
      }
      else
      {
         _loc1_.frb_states_mc.gotoAndStop("unselectedDisabled");
         _loc1_.enabled = false;
         _loc1_.selected = false;
         _loc1_.tabEnabled = false;
      }
   }
   if(Accessibility.isActive())
   {
      Accessibility.sendEvent(_loc1_,0,_loc1_.EVENT_OBJECT_STATECHANGE,true);
   }
};
FRadioButtonClass.prototype.getValue = function()
{
   var _loc1_ = this;
   if(_loc1_.selected)
   {
      if(_loc1_.data == "" || _loc1_.data == undefined)
      {
         return _loc1_.getLabel();
      }
      return _loc1_.data;
   }
};
FRadioButtonClass.prototype.setEnabled = function(enable)
{
   var _loc1_ = this;
   if(enable == true || enable == undefined)
   {
      _loc1_.enable = true;
      super.setEnabled(true);
   }
   else
   {
      _loc1_.enable = false;
      super.setEnabled(false);
   }
   _loc1_.setState(_loc1_.selected);
   var cgn = _loc1_._parent[_loc1_.groupName].getEnabled() == undefined;
   var _loc3_ = _loc1_._parent[_loc1_.groupName].radioInstances[0].getEnabled() == false;
   var _loc2_;
   if(cgn && _loc3_)
   {
      _loc2_ = 0;
      while(_loc2_ < _loc1_._parent[_loc1_.groupName].radioInstances.length)
      {
         if(_loc1_._parent[_loc1_.groupName].radioInstances[_loc2_].getEnabled() == true)
         {
            _loc1_._parent[_loc1_.groupName].radioInstances[_loc2_].tabEnabled = true;
            break;
         }
         _loc2_ = _loc2_ + 1;
      }
   }
};
FRadioButtonClass.prototype.getEnabled = function()
{
   return this.enable;
};
FRadioButtonClass.prototype.setLabel = function(label)
{
   var _loc1_ = this;
   _loc1_.fLabel_mc.setLabel(label);
   _loc1_.txtFormat();
   if(Accessibility.isActive())
   {
      Accessibility.sendEvent(_loc1_,0,_loc1_.EVENT_OBJECT_NAMECHANGE);
   }
};
FRadioButtonClass.prototype.getLabel = function()
{
   return this.fLabel_mc.getLabel();
};
FRadioButtonClass.prototype.onPress = function()
{
   this.pressFocus();
   this.frb_states_mc.gotoAndStop("press");
};
FRadioButtonClass.prototype.onRelease = function()
{
   var _loc1_ = this;
   _loc1_.frb_states_mc.gotoAndStop("unselectedDisabled");
   _loc1_.setValue(!_loc1_.selected);
};
FRadioButtonClass.prototype.onReleaseOutside = function()
{
   this.frb_states_mc.gotoAndStop("unselectedEnabled");
};
FRadioButtonClass.prototype.onDragOut = function()
{
   this.frb_states_mc.gotoAndStop("unselectedEnabled");
};
FRadioButtonClass.prototype.onDragOver = function()
{
   this.frb_states_mc.gotoAndStop("press");
};
FRadioButtonClass.prototype.executeCallBack = function()
{
   var _loc1_ = this;
   _loc1_.handlerObj[_loc1_.changeHandler](_loc1_._parent[_loc1_.groupName]);
};
FRadioButtonGroupClass.prototype.addRadioInstance = function(instance)
{
   this.radioInstances.push(instance);
   this.radioInstances[0].tabEnabled = true;
};
FRadioButtonGroupClass.prototype.setEnabled = function(enableFlag)
{
   var _loc2_ = this;
   var _loc3_ = enableFlag;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      _loc2_.radioInstances[_loc1_].setEnabled(_loc3_);
      _loc1_ = _loc1_ + 1;
   }
};
FRadioButtonGroupClass.prototype.getEnabled = function()
{
   var _loc2_ = this;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      if(_loc2_.radioInstances[_loc1_].getEnabled() != _loc2_.radioInstances[0].getEnabled())
      {
         return;
      }
      _loc1_ = _loc1_ + 1;
   }
   return _loc2_.radioInstances[0].getEnabled();
};
FRadioButtonGroupClass.prototype.setChangeHandler = function(changeHandler, obj)
{
   var _loc2_ = this;
   var _loc3_ = changeHandler;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      _loc2_.radioInstances[_loc1_].setChangeHandler(_loc3_,obj);
      _loc1_ = _loc1_ + 1;
   }
};
FRadioButtonGroupClass.prototype.getValue = function()
{
   var _loc2_ = this;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      if(_loc2_.radioInstances[_loc1_].selected == true)
      {
         if(_loc2_.radioInstances[_loc1_].data == "" || _loc2_.radioInstances[_loc1_].data == undefined)
         {
            return _loc2_.radioInstances[_loc1_].getLabel();
         }
         return _loc2_.radioInstances[_loc1_].data;
      }
      _loc1_ = _loc1_ + 1;
   }
};
FRadioButtonGroupClass.prototype.getData = function()
{
   var _loc2_ = this;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      if(_loc2_.radioInstances[_loc1_].selected)
      {
         return _loc2_.radioInstances[_loc1_].getData();
      }
      _loc1_ = _loc1_ + 1;
   }
};
FRadioButtonGroupClass.prototype.getInstance = function()
{
   var _loc2_ = this;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      if(_loc2_.radioInstances[_loc1_].selected == true)
      {
         return _loc1_;
      }
      undefined;
      _loc1_ = _loc1_ + 1;
   }
};
FRadioButtonGroupClass.prototype.setValue = function(dataValue)
{
   var _loc1_ = this;
   var _loc3_ = dataValue;
   var _loc2_ = 0;
   while(true)
   {
      if(_loc2_ >= _loc1_.radioInstances.length)
      {
         _loc2_ = 0;
         while(_loc2_ < _loc1_.radioInstances.length)
         {
            if(_loc1_.radioInstances[_loc2_].getLabel() == _loc3_)
            {
               _loc1_.radioInstances[_loc2_].setValue(true);
            }
            _loc2_ = _loc2_ + 1;
         }
         break;
      }
      if(_loc1_.radioInstances[_loc2_].data == _loc3_)
      {
         _loc1_.radioInstances[_loc2_].setValue(true);
         break;
      }
      _loc2_ = _loc2_ + 1;
   }
};
FRadioButtonGroupClass.prototype.setSize = function(w)
{
   var _loc2_ = this;
   var _loc3_ = w;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      _loc2_.radioInstances[_loc1_].setSize(_loc3_);
      _loc1_ = _loc1_ + 1;
   }
};
FRadioButtonGroupClass.prototype.getSize = function()
{
   var _loc2_ = this;
   var _loc3_ = 0;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      if(_loc2_.radioInstances[_loc1_].width >= _loc3_)
      {
         _loc3_ = _loc2_.radioInstances[_loc1_].width;
      }
      _loc1_ = _loc1_ + 1;
   }
   return _loc3_;
};
FRadioButtonGroupClass.prototype.setGroupName = function(groupName)
{
   var _loc2_ = this;
   var _loc3_ = groupName;
   _loc2_.oldGroupName = _loc2_.radioInstances[0].groupName;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      _loc2_.radioInstances[_loc1_].groupName = _loc3_;
      _loc2_.radioInstances[_loc1_].addToRadioGroup();
      _loc1_ = _loc1_ + 1;
   }
   delete _loc2_._parent[_loc2_.oldGroupName];
};
FRadioButtonGroupClass.prototype.getGroupName = function()
{
   return this.radioInstances[0].groupName;
};
FRadioButtonGroupClass.prototype.setLabelPlacement = function(pos)
{
   var _loc2_ = this;
   var _loc3_ = pos;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      _loc2_.radioInstances[_loc1_].setLabelPlacement(_loc3_);
      _loc1_ = _loc1_ + 1;
   }
};
FRadioButtonGroupClass.prototype.setStyleProperty = function(propName, value, isGlobal)
{
   var _loc2_ = this;
   var _loc3_ = value;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      _loc2_.radioInstances[_loc1_].setStyleProperty(propName,_loc3_,isGlobal);
      _loc1_ = _loc1_ + 1;
   }
};
FRadioButtonGroupClass.prototype.addListener = function()
{
   var _loc2_ = this;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      _loc2_.radioInstances[_loc1_].addListener();
      _loc1_ = _loc1_ + 1;
   }
};
FRadioButtonGroupClass.prototype.applyChanges = function()
{
   var _loc2_ = this;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      _loc2_.radioInstances[_loc1_].applyChanges();
      _loc1_ = _loc1_ + 1;
   }
};
FRadioButtonGroupClass.prototype.removeListener = function(component)
{
   var _loc2_ = this;
   var _loc3_ = component;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.radioInstances.length)
   {
      _loc2_.radioInstances[_loc1_].removeListener(_loc3_);
      _loc1_ = _loc1_ + 1;
   }
};
FRadioButtonClass.prototype.drawFocusRect = function()
{
   var _loc1_ = this;
   _loc1_.drawRect(-2,-2,_loc1_._width + 6,_loc1_._height - 3);
};
FRadioButtonClass.prototype.myOnKillFocus = function()
{
   var _loc1_ = this;
   Key.removeListener(_loc1_.keyListener);
   _loc1_.focused = false;
   _loc1_.focusRect.removeMovieClip();
   _loc1_._parent[_loc1_.groupName].foobar = 0;
};
FRadioButtonClass.prototype.myOnKeyDown = function()
{
   var _loc1_ = this;
   if(Key.getCode() == 32 && _loc1_._parent[_loc1_.groupName].getValue() == undefined)
   {
      if(_loc1_._parent[_loc1_.groupName].radioInstances[0] == _loc1_)
      {
         _loc1_.setTabState(true);
      }
   }
   var _loc2_;
   var _loc3_;
   if(Key.getCode() == 40 && _loc1_.pressOnce == undefined)
   {
      _loc1_.foobar = _loc1_._parent[_loc1_.groupName].getInstance();
      _loc2_ = _loc1_.foobar;
      while(true)
      {
         if(_loc2_ < _loc1_._parent[_loc1_.groupName].radioInstances.length)
         {
            _loc3_ = _loc2_ + 1;
            if(_loc1_._parent[_loc1_.groupName].radioInstances[_loc3_].getEnabled())
            {
               _loc1_._parent[_loc1_.groupName].radioInstances[_loc3_].setTabState(true);
               break;
            }
            continue;
         }
         _loc2_ = _loc2_ + 1;
      }
      return;
   }
   if(Key.getCode() == 38 && _loc1_.pressOnce == undefined)
   {
      _loc1_.foobar = _loc1_._parent[_loc1_.groupName].getInstance();
      _loc2_ = _loc1_.foobar;
      while(_loc2_ >= 0)
      {
         _loc3_ = _loc2_ - 1;
         if(_loc1_._parent[_loc1_.groupName].radioInstances[_loc3_].getEnabled())
         {
            _loc1_._parent[_loc1_.groupName].radioInstances[_loc3_].setTabState(true);
            break;
         }
         _loc2_ = _loc2_ - 1;
      }
   }
};
FRadioButtonClass.prototype.get_accRole = function(childId)
{
   return this.master.ROLE_SYSTEM_RADIOBUTTON;
};
FRadioButtonClass.prototype.get_accName = function(childId)
{
   return this.master.getLabel();
};
FRadioButtonClass.prototype.get_accState = function(childId)
{
   if(this.master.getState())
   {
      return this.master.STATE_SYSTEM_SELECTED;
   }
   return 0;
};
FRadioButtonClass.prototype.get_accDefaultAction = function(childId)
{
   if(this.master.getState())
   {
      return "UnCheck";
   }
   return "Check";
};
FRadioButtonClass.prototype.accDoDefaultAction = function(childId)
{
   this.master.setValue(!this.master.getValue());
};
