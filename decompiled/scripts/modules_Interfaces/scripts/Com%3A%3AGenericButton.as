Class_GenericButton = function()
{
   var _loc1_ = this;
   _loc1_.labelformat = new TextFormat();
   _loc1_.labelformat.font = "Verdana";
   _loc1_.labelformat.size = 11;
   _loc1_.labelformat.color = 16777215;
   _loc1_.labelformat.bold = true;
   _loc1_.attachMovie("backOutSymbol","backOut",1);
   _loc1_.attachMovie("backOverSymbol","backOver",2);
   _loc1_.attachMovie("backPressSymbol","backPress",3);
   _loc1_.backOut._visible = false;
   _loc1_.backOver._visible = false;
   _loc1_.backPress._visible = false;
   _loc1_.createTextField("txtLabel",4,0,0,0,0);
   _loc1_.txtLabel.selectable = false;
   _loc1_.changeState("Out");
   _loc1_.setEnabled(true);
};
Class_GenericButton.prototype = new MovieClip();
Object.registerClass("Com::GenericButton",Class_GenericButton);
Class_GenericButton.prototype.changeState = function(state)
{
   var _loc1_ = this;
   _loc1_["back" + state]._visible = true;
   _loc1_["back" + _loc1_.lastState]._visible = false;
   _loc1_.lastState = state;
};
Class_GenericButton.prototype.setLabel = function(label)
{
   var _loc1_ = this.txtLabel;
   _loc1_.autoSize = "center";
   _loc1_.text = label;
   _loc1_.setTextFormat(this.labelFormat);
   _loc1_._x = (- _loc1_.textWidth) / 2 - 2;
   _loc1_._y = (- _loc1_.textHeight) / 2 - 2;
};
Class_GenericButton.prototype.KeyUp = function()
{
   if(Key.getCode() == 13)
   {
      this.onRelease();
   }
};
Class_GenericButton.prototype.setEnabled = function(bool)
{
   var _loc1_ = this;
   _loc1_.attachMovie("maskSymbol","mask",5);
   var _loc3_;
   var _loc2_;
   if(bool)
   {
      _loc1_.mask.onRollOver = _loc1_.mask.onDragOver = function()
      {
         this._parent.changeState("Over");
      };
      _loc1_.mask.onRollOut = _loc1_.mask.onDragOut = function()
      {
         this._parent.changeState("Out");
      };
      _loc1_.mask.onPress = function()
      {
         this._parent.changeState("Press");
      };
      _loc1_.mask.onRelease = _loc1_.mask.onReleaseOutside = function()
      {
         this._parent.changeState("Over");
         this._parent.onAction();
      };
   }
   else
   {
      _loc3_ = new Color(_loc1_.mask);
      _loc2_ = new Object();
      _loc2_ = {ra:"100",rb:"0",ga:"100",gb:"0",ba:"100",bb:"0",aa:"50",ab:"100"};
      _loc3_.setTransform(_loc2_);
      delete _loc1_.mask.onRollOver;
      delete _loc1_.mask.onDragOver;
      delete _loc1_.mask.onRollOut;
      delete _loc1_.mask.onDragOut;
      delete _loc1_.mask.onPress;
      delete _loc1_.mask.onRelease;
      delete _loc1_.mask.onReleaseOutside;
   }
};
