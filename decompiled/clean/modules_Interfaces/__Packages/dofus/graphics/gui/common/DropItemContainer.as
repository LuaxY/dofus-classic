class dofus.graphics.gui.common.DropItemContainer extends dofus.graphics.gui.common.ItemContainer
{
   var _bEnabled;
   var _positionID;
   var _superType;
   var broadcastMessage;
   var usedSquare_mc;
   function DropItemContainer()
   {
      super();
      this.initialize();
   }
   function get enabled()
   {
      return this._bEnabled;
   }
   function get superType()
   {
      return this._superType;
   }
   function get positionID()
   {
      return this._positionID;
   }
   function set isEmpty(bool)
   {
      super.isEmpty = bool;
      this.usedSquare_mc._visible = !bool;
   }
   function initialize()
   {
      super.initialize();
      this.setEnabled(true);
   }
   function setEnabled(bool)
   {
      super.setEnabled(bool);
      this.select(bool);
   }
   function select(bool)
   {
      var _loc1_ = bool;
      var _loc2_ = this;
      if(!_loc2_._bEnabled)
      {
         _loc1_ = false;
      }
      _loc2_.selectedSquare_mc._visible = _loc1_;
      _loc2_.emptySquare_mc._visible = !_loc1_;
   }
   function rollOver()
   {
      var _loc2_ = new Color(this);
      var _loc1_ = new Object();
      _loc1_.ra = 70;
      _loc1_.rb = 128;
      _loc1_.ga = 0;
      _loc1_.gb = 128;
      _loc1_.ba = 0;
      _loc1_.bb = 255;
      _loc2_.setTransform(_loc1_);
   }
   function rollOut()
   {
      var _loc2_ = new Color(this);
      var _loc1_ = new Object();
      _loc1_.ra = 100;
      _loc1_.rb = 0;
      _loc1_.ga = 100;
      _loc1_.gb = 0;
      _loc1_.ba = 100;
      _loc1_.bb = 0;
      _loc2_.setTransform(_loc1_);
   }
   function release()
   {
      var _loc1_ = _global;
      var _loc2_;
      if(_loc1_.INTERFACE.lastSpellcursorData != null)
      {
         _loc2_ = _loc1_.INTERFACE.lastSpellcursorData;
         this.broadcastMessage("onDropItem",_loc2_);
         _loc1_.INTERFACE.lastSpellcursorData = null;
      }
   }
   function press()
   {
      _global.INTERFACE.lastSpellcursorData = null;
   }
}
