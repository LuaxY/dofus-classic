Class_InterfaceButtonSpellPanel = function()
{
   this.init();
};
Class_InterfaceButtonSpellPanel.prototype = new MovieClip();
Object.registerClass("Interface::ButtonSpellPanel",Class_InterfaceButtonSpellPanel);
Class_InterfaceButtonSpellPanel.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.container.onRollOver = _loc1_.container.onDragOver = function()
   {
      var _loc2_ = this;
      _loc2_.select(true);
      var _loc1_;
      if(_loc2_.isEmpty() == false)
      {
         _loc1_ = _loc2_._parent._parent._parent;
         _loc1_.Infos_mc._y = -258.7;
         _loc1_.Infos_mc.setSpellInfos(_loc2_.data);
      }
   };
   _loc1_.container.onRollOut = _loc1_.container.onDragOut = _loc1_.container.onReleaseOutside = function()
   {
      this.select(false);
      var _loc1_ = this._parent._parent._parent;
      _loc1_.Infos_mc._y = -88.7;
   };
   _loc1_.container.onPress = function()
   {
      var _loc1_ = this;
      if(_loc1_.isEmpty() == false)
      {
         INTERFACE.setSpellCursor(_loc1_.data);
         _loc1_.onMouseUp = function()
         {
            INTERFACE.setSpellCursor(null);
            delete this.onMouseUp;
         };
         Mouse.addListener(_loc1_);
      }
   };
};
