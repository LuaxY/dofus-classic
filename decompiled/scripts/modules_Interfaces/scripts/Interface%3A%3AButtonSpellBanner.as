Class_InterfaceButtonSpellBanner = function()
{
   this.init();
};
Class_InterfaceButtonSpellBanner.prototype = new MovieClip();
Object.registerClass("Interface::ButtonSpellBanner",Class_InterfaceButtonSpellBanner);
Class_InterfaceButtonSpellBanner.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.justDrop = false;
   _loc1_.txtNum.text = _loc1_.num;
   _loc1_.container.onRollOver = _loc1_.container.onDragOver = function()
   {
      var _loc1_ = this;
      if(_loc1_.isEmpty() == true || INTERFACE.getSpellCursor() != undefined || INTERFACE.getCursor() != undefined)
      {
         _loc1_.select(true);
      }
      else
      {
         _loc1_.select(true,_loc1_.data.m_Name + " (" + _loc1_.data.m_APCost + " " + getText("AP") + ")");
      }
   };
   _loc1_.container.onRollOut = _loc1_.container.onDragOut = function()
   {
      this.select(false);
   };
   _loc1_.container.onPress = function()
   {
      var _loc1_ = this;
      var _loc3_ = _loc1_._parent._parent._parent;
      var _loc2_ = _loc3_.getCurrentPanel();
      if(_loc2_ == "Spells")
      {
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
      }
   };
   _loc1_.container.onRelease = function()
   {
      var _loc1_ = this;
      _loc1_.select(false);
      var banner = _loc1_._parent._parent._parent;
      var p = banner.getCurrentPanel();
      var _loc2_;
      var _loc3_;
      if(p == "Spells")
      {
         if(INTERFACE.lastSpellcursorData != null)
         {
            _loc2_ = _loc1_.getData();
            if(_loc2_ != null)
            {
               _loc2_.m_Position = null;
            }
            _loc1_.setItem(INTERFACE.lastSpellcursorData);
            INTERFACE.lastSpellcursorData = null;
            _loc3_ = _loc1_.data.m_Position == null ? undefined : _loc1_.data.m_Position;
            _loc1_.data.m_Position = _loc1_._parent._name.substr(2);
            var banner = _loc1_._parent._parent._parent;
            banner.onAddUsedSpell(_loc3_,_loc1_.data);
            INTERFACE.setSpellCursor(null);
         }
      }
      else if(!_loc1_.isEmpty())
      {
         KERNEL.switchToSpellLaunch(_loc1_.data);
      }
   };
};
