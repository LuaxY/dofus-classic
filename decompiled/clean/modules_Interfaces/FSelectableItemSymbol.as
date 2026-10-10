function FSelectableItemClass()
{
   this.init();
}; //unpopped
FSelectableItemClass.prototype = new FUIComponentClass();
FSelectableItemClass.prototype.init = function()
{
   var _loc1_ = this;
   if(_loc1_._name != "itemAsset")
   {
      _loc1_.highlighted = false;
      _loc1_.layoutContent(100);
   }
};
FSelectableItemClass.prototype.drawItem = function(itmObj, selected)
{
   var _loc1_ = this;
   var _loc2_ = selected;
   _loc1_.displayContent(itmObj,_loc2_);
   if(_loc1_.highlighted != _loc2_ || _loc1_.controller.focused != _loc1_.oldFocus && _loc2_)
   {
      _loc1_.setHighlighted(_loc2_);
   }
   _loc1_.oldFocus = _loc1_.controller.focused;
};
FSelectableItemClass.prototype.setSize = function(width, height)
{
   var _loc1_ = this;
   var _loc3_ = width;
   var _loc2_ = -16384;
   _loc1_.width = _loc3_;
   _loc1_.layoutContent(_loc3_);
   _loc1_.attachMovie("FHighlightSymbol","highlight_mc",_loc2_);
   _loc1_.highlight_mc._x = 0.5;
   _loc1_.highlight_mc._width = _loc3_ - 0.5;
   _loc1_.highlight_mc._height = height;
   _loc1_.highlight_mc.controller = _loc1_;
   _loc1_.highlight_mc._alpha = 0;
   _loc1_.highlight_mc.trackAsMenu = true;
   _loc1_.highlight_mc.onPress = function()
   {
      var _loc1_ = this;
      if(_loc1_.controller.enable)
      {
         _loc1_.controller.controller.clickHandler(_loc1_.controller.itemNum);
      }
   };
   _loc1_.highlight_mc.onDragOver = function()
   {
      if(this.controller.controller.focused)
      {
         this.onPress();
      }
   };
   _loc1_.highlight_mc.useHandCursor = false;
   _loc1_.highlight_mc.trackAsMenu = true;
};
FSelectableItemClass.prototype.setEnabled = function(enabledFlag)
{
   var _loc1_ = this;
   var _loc2_ = enabledFlag;
   _loc1_.enable = _loc2_;
   _loc1_.fLabel_mc.setEnabled(_loc2_);
   _loc1_.highlight_mc.gotoAndStop(!_loc2_ ? "disabled" : "unfocused");
};
FSelectableItemClass.prototype.layoutContent = function(width)
{
   var _loc1_ = this;
   _loc1_.attachMovie("FLabelSymbol","fLabel_mc",2,{hostComponent:_loc1_.controller});
   _loc1_.fLabel_mc._x = 2;
   _loc1_.fLabel_mc._y = 0;
   _loc1_.fLabel_mc.setSize(width - 2);
   _loc1_.fLabel_mc.labelField.selectable = false;
};
FSelectableItemClass.prototype.displayContent = function(itmObj, selected)
{
   var _loc2_ = itmObj;
   var _loc1_ = "";
   if(_loc2_.label != undefined)
   {
      _loc1_ = _loc2_.label;
   }
   else if(typeof _loc2_ == "object")
   {
      for(var _loc3_ in _loc2_)
      {
         if(_loc3_ != "__ID__")
         {
            _loc1_ = _loc2_[_loc3_] + ", " + _loc1_;
         }
      }
      _loc1_ = _loc1_.substring(0,_loc1_.length - 2);
   }
   else
   {
      _loc1_ = _loc2_;
   }
   if(this.fLabel_mc.labelField.text != _loc1_)
   {
      this.fLabel_mc.setLabel(_loc1_);
   }
   var clr = !selected ? this.controller.styleTable.textColor.value : this.controller.styleTable.textSelected.value;
   if(clr == undefined)
   {
      clr = !selected ? 0 : 16777215;
   }
   this.fLabel_mc.setColor(clr);
};
FSelectableItemClass.prototype.getItemIndex = function()
{
   return this.controller.getScrollPosition() + this.itemNum;
};
FSelectableItemClass.prototype.getItemModel = function()
{
   return this.controller.getItemAt(this.getItemIndex());
};
FSelectableItemClass.prototype.getHostDataProvider = function()
{
   return this.controller.dataProvider;
};
FSelectableItemClass.prototype.setHighlighted = function(flag)
{
   var _loc1_ = this;
   var _loc2_ = flag;
   fade = _loc1_.controller.styleTable.fadeRate.value;
   if(fade == undefined || fade == 0 || !_loc2_)
   {
      _loc1_.highlight_mc._alpha = !_loc2_ ? 0 : 100;
      delete _loc1_.onEnterFrame;
   }
   else
   {
      _loc1_.fadeN = fade;
      _loc1_.fadeX = 1;
      _loc1_.highLight_mc._alpha = 20;
      _loc1_.onEnterFrame = function()
      {
         var _loc1_ = this;
         _loc1_.highLight_mc._alpha = 60 * Math.sqrt(_loc1_.fadeX++ / _loc1_.fadeN) + 40;
         if(_loc1_.fadeX > _loc1_.fadeN)
         {
            delete _loc1_.onEnterFrame;
         }
      };
   }
   _loc1_.highlighted = _loc2_;
};
