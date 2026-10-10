function FPushButtonClass()
{
   this.init();
}; //unpopped
FPushButtonClass.prototype = new FUIComponentClass();
Object.registerClass("Ank::Dofus::PushButton",FPushButtonClass);
FPushButtonClass.prototype.init = function()
{
   var _loc1_ = this;
   super.setSize(_loc1_._width,_loc1_._height);
   _loc1_.boundingBox_mc.unloadMovie();
   _loc1_.attachMovie("fpb_states","fpbState_mc",1);
   _loc1_.attachMovie(_loc1_.labelClipSymbol,"fLabel_mc",2);
   _loc1_.attachMovie("fpb_hitArea","fpb_hitArea_mc",3);
   super.init();
   _loc1_.btnState = false;
   _loc1_.setClickHandler(_loc1_.clickHandler);
   _loc1_._xscale = 100;
   _loc1_._yscale = 100;
   _loc1_.setSize(_loc1_.width,_loc1_.height);
   _loc1_.textStyle = new TextFormat();
   if(_loc1_.label != undefined)
   {
      _loc1_.setLabel(_loc1_.label);
   }
   _loc1_.ROLE_SYSTEM_PUSHBUTTON = 43;
   _loc1_.STATE_SYSTEM_PRESSED = 8;
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
FPushButtonClass.prototype.setHitArea = function(w, h)
{
   var _loc1_ = this.fpb_hitArea_mc;
   this.hitArea = _loc1_;
   _loc1_._visible = false;
   _loc1_._width = w;
   _loc1_._height = arguments.length <= 1 ? _loc1_._height : h;
};
FPushButtonClass.prototype.setSize = function(w, h)
{
   var _loc1_ = this;
   var _loc2_ = w;
   var _loc3_ = h;
   _loc2_ = _loc2_ >= 6 ? _loc2_ : 6;
   if(arguments.length > 1)
   {
      if(_loc3_ < 6)
      {
         _loc3_ = 6;
      }
   }
   super.setSize(_loc2_,_loc3_);
   _loc1_.setLabel(_loc1_.getLabel());
   _loc1_.arrangeLabel();
   _loc1_.setHitArea(_loc2_,_loc3_);
   _loc1_.boundingBox_mc._width = _loc2_;
   _loc1_.boundingBox_mc._height = _loc3_;
   _loc1_.drawFrame();
   if(_loc1_.focused)
   {
      super.myOnSetFocus();
   }
   _loc1_.initContentPos("fLabel_mc");
};
FPushButtonClass.prototype.arrangeLabel = function()
{
   var _loc3_ = this;
   var _loc1_ = _loc3_.fLabel_mc;
   var h = _loc3_.height;
   var w = _loc3_.width - 2;
   var _loc2_ = 1;
   _loc3_.fLabel_mc.setSize(w - _loc2_ * 4);
   _loc1_._x = _loc2_ * 3;
   _loc1_._y = h / 2 - _loc1_._height / 2;
};
FPushButtonClass.prototype.getLabel = function()
{
   return this.fLabel_mc.labelField.text;
};
FPushButtonClass.prototype.setLabel = function(label)
{
   var _loc1_ = this;
   _loc1_.fLabel_mc.setLabel(label);
   _loc1_.txtFormat();
   _loc1_.arrangeLabel();
   if(Accessibility.isActive())
   {
      Accessibility.sendEvent(_loc1_,0,_loc1_.EVENT_OBJECT_NAMECHANGE);
   }
};
FPushButtonClass.prototype.getEnabled = function()
{
   return this.enabled;
};
FPushButtonClass.prototype.setEnabled = function(enable)
{
   var _loc1_ = this;
   if(enable || enable == undefined)
   {
      _loc1_.gotoFrame(1);
      _loc1_.drawFrame();
      _loc1_.flabel_mc.setEnabled(true);
      _loc1_.enabled = true;
      super.setEnabled(true);
   }
   else
   {
      _loc1_.gotoFrame(4);
      _loc1_.drawFrame();
      _loc1_.flabel_mc.setEnabled(false);
      _loc1_.enabled = false;
      super.setEnabled(false);
   }
};
FPushButtonClass.prototype.txtFormat = function()
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.textStyle;
   var _loc3_ = _loc1_.styleTable;
   _loc2_.font = "Font2";
   _loc2_.color = 16777215;
   _loc2_.align = _loc3_.textAlign.value != undefined ? undefined : (_loc2_.align = "center");
   _loc2_.leftMargin = _loc3_.textLeftMargin.value != undefined ? undefined : (_loc2_.leftMargin = 1);
   _loc2_.rightMargin = _loc3_.textRightMargin.value != undefined ? undefined : (_loc2_.rightMargin = 1);
   if(_loc1_.fLabel_mc._height > _loc1_.height)
   {
      super.setSize(_loc1_.width,_loc1_.fLabel_mc._height);
   }
   else
   {
      super.setSize(_loc1_.width,_loc1_.height);
   }
   _loc1_.fLabel_mc.labelField.setTextFormat(_loc1_.textStyle);
   _loc1_.fLabel_mc.labelField.embedFonts = true;
   _loc1_.setEnabled(_loc1_.enable);
};
FPushButtonClass.prototype.drawFrame = function()
{
   var _loc2_ = this;
   var mc_array = ["up_mc","over_mc","down_mc","disabled_mc"];
   var _loc3_ = mc_array[_loc2_.fpbState_mc._currentframe - 1];
   var _loc1_ = _loc2_.fpbState_mc[_loc3_];
   _loc1_.mc_faceMiddle._x = _loc1_.mc_faceLeft._width;
   _loc1_.mc_faceMiddle._width = _loc2_.width - _loc1_.mc_faceLeft._width - _loc1_.mc_faceRight._width;
   _loc1_.mc_faceRight._x = _loc2_.width;
   _loc1_.mc_lightRight._x = _loc2_.width;
};
FPushButtonClass.prototype.setClickHandler = function(chng, obj)
{
   var _loc1_ = this;
   _loc1_.handlerObj = arguments.length >= 2 ? obj : _loc1_._parent;
   _loc1_.clickHandler = chng;
};
FPushButtonClass.prototype.executeCallBack = function()
{
   var _loc1_ = this;
   _loc1_.handlerObj[_loc1_.clickHandler](_loc1_);
};
FPushButtonClass.prototype.initContentPos = function(mc)
{
   var _loc1_ = this;
   _loc1_.incrVal = 1;
   _loc1_.initx = _loc1_[mc]._x - (_loc1_.getBtnState() != true ? 0 : _loc1_.incrVal);
   _loc1_.inity = _loc1_[mc]._y - (_loc1_.getBtnState() != true ? 0 : _loc1_.incrVal);
   _loc1_.togx = _loc1_.initx + _loc1_.incrVal;
   _loc1_.togy = _loc1_.inity + _loc1_.incrVal;
};
FPushButtonClass.prototype.setBtnState = function(state)
{
   this.btnState = state;
};
FPushButtonClass.prototype.getBtnState = function()
{
   return this.btnState;
};
FPushButtonClass.prototype.myOnSetFocus = function()
{
   this.focused = true;
   super.myOnSetFocus();
};
FPushButtonClass.prototype.onPress = function()
{
   var _loc1_ = this;
   _loc1_.pressFocus();
   _loc1_.fpbState_mc.gotoAndStop(3);
   _loc1_.drawFrame();
   _loc1_.setBtnState(true);
   if(Accessibility.isActive())
   {
      Accessibility.sendEvent(_loc1_,0,_loc1_.EVENT_OBJECT_STATECHANGE,true);
   }
};
FPushButtonClass.prototype.onRelease = function()
{
   var _loc1_ = this;
   _loc1_.fpbState_mc.gotoAndStop(2);
   _loc1_.drawFrame();
   _loc1_.executeCallBack();
   _loc1_.setBtnState(false);
   if(Accessibility.isActive())
   {
      Accessibility.sendEvent(_loc1_,0,_loc1_.EVENT_OBJECT_STATECHANGE,true);
   }
};
FPushButtonClass.prototype.onRollOver = function()
{
   this.fpbState_mc.gotoAndStop(2);
   this.drawFrame();
};
FPushButtonClass.prototype.onRollOut = function()
{
   this.fpbState_mc.gotoAndStop(1);
   this.drawFrame();
};
FPushButtonClass.prototype.onReleaseOutside = function()
{
   var _loc1_ = this;
   _loc1_.setBtnState(false);
   _loc1_.fpbState_mc.gotoAndStop(1);
   _loc1_.drawFrame();
};
FPushButtonClass.prototype.onDragOut = function()
{
   var _loc1_ = this;
   _loc1_.setBtnState(false);
   _loc1_.fpbState_mc.gotoAndStop(1);
   _loc1_.drawFrame();
};
FPushButtonClass.prototype.onDragOver = function()
{
   var _loc1_ = this;
   _loc1_.setBtnState(true);
   _loc1_.fpbState_mc.gotoAndStop(3);
   _loc1_.drawFrame();
};
FPushButtonClass.prototype.myOnKeyDown = function()
{
   var _loc1_ = this;
   if(Key.getCode() == 32 && _loc1_.pressOnce == undefined)
   {
      _loc1_.onPress();
      _loc1_.pressOnce = 1;
   }
};
FPushButtonClass.prototype.myOnKeyUp = function()
{
   if(Key.getCode() == 32)
   {
      this.onRelease();
      this.pressOnce = undefined;
   }
};
FPushButtonClass.prototype.get_accRole = function(childId)
{
   return this.master.ROLE_SYSTEM_PUSHBUTTON;
};
FPushButtonClass.prototype.get_accName = function(childId)
{
   return this.master.getLabel();
};
FPushButtonClass.prototype.get_accState = function(childId)
{
   var _loc1_ = this;
   if(_loc1_.pressOnce)
   {
      return _loc1_.master.STATE_SYSTEM_PRESSED;
   }
   return _loc1_.master.STATE_SYSTEM_DEFAULT;
};
FPushButtonClass.prototype.get_accDefaultAction = function(childId)
{
   return "Press";
};
FPushButtonClass.prototype.accDoDefaultAction = function(childId)
{
   this.master.onPress();
   this.master.onRelease();
};
