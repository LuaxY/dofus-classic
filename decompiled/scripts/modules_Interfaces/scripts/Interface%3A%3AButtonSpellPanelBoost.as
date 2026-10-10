Class_InterfaceButtonSpellPanelBoost = function()
{
   this.init();
};
Class_InterfaceButtonSpellPanelBoost.prototype = new MovieClip();
Object.registerClass("Interface::ButtonSpellPanelBoost",Class_InterfaceButtonSpellPanelBoost);
Class_InterfaceButtonSpellPanelBoost.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.container.onRollOver = _loc1_.container.onDragOver = function()
   {
      this.select(true);
   };
   _loc1_.container.onRollOut = _loc1_.container.onDragOut = _loc1_.container.onReleaseOutside = function()
   {
      this.select(false);
   };
   _loc1_.container.onRelease = function()
   {
      var _loc1_ = this;
      _loc1_.select(false);
      var _loc2_;
      if(INTERFACE.lastSpellcursorData != null)
      {
         _loc1_.setItem(INTERFACE.lastSpellcursorData);
         INTERFACE.lastSpellcursorData = null;
         AKS.Spells.output = _loc1_._parent._parent;
         _loc2_ = _loc1_._parent._parent._parent._parent;
         _loc2_.onWantBootSpell(_loc1_.data);
      }
      else
      {
         _loc1_._parent._parent.initBoost();
      }
   };
};
