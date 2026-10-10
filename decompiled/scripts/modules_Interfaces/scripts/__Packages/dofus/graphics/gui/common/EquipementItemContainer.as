class dofus.graphics.gui.common.EquipementItemContainer extends dofus.graphics.gui.common.ItemContainer
{
   var _bEnabled;
   var _positionID;
   var _superType;
   var broadcastMessage;
   var usedSquare_mc;
   function EquipementItemContainer()
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
   function selectBlink(bool)
   {
      var _loc1_ = this;
      _loc1_.selectedBlinkSquare_mc._visible = bool;
      if(bool)
      {
         _loc1_.selectedBlinkSquare_mc.play();
      }
      else
      {
         _loc1_.selectedBlinkSquare_mc.gotoAndStop(1);
      }
   }
   function select(bool)
   {
      var _loc1_ = this;
      var _loc2_ = bool;
      if(!_loc1_._bEnabled)
      {
         _loc2_ = false;
      }
      _loc1_.selectedSquare_mc._visible = _loc2_;
      _loc1_.emptySquare_mc._visible = !_loc2_;
      _loc1_.selectedBlinkSquare_mc._visible = false;
      _loc1_.selectedBlinkSquare_mc.gotoAndStop(1);
   }
   function rollOver()
   {
      var _loc2_ = this;
      var _loc3_ = new Color(_loc2_);
      var _loc1_ = new Object();
      _loc1_.ra = 70;
      _loc1_.rb = 128;
      _loc1_.ga = 70;
      _loc1_.gb = 128;
      _loc1_.ba = 70;
      _loc1_.bb = 128;
      _loc3_.setTransform(_loc1_);
      if(!_loc2_.isEmpty)
      {
         _loc2_.broadcastMessage("onItemInfos",_loc2_.data);
      }
   }
   function rollOut()
   {
      var _loc3_ = this;
      var _loc2_ = new Color(_loc3_);
      var _loc1_ = new Object();
      _loc1_.ra = 100;
      _loc1_.rb = 0;
      _loc1_.ga = 100;
      _loc1_.gb = 0;
      _loc1_.ba = 100;
      _loc1_.bb = 0;
      _loc2_.setTransform(_loc1_);
      if(!_loc3_.isEmpty)
      {
         _loc3_.broadcastMessage("onItemInfos",null);
      }
   }
   function release()
   {
      var _loc1_ = this;
      var _loc3_ = _global;
      var _loc2_;
      if(!_loc3_.DATACENTER.Game.isFight)
      {
         if(_loc3_.INTERFACE.lastSpellcursorData != null)
         {
            _loc2_ = _loc3_.INTERFACE.lastSpellcursorData;
            if(Number(_loc2_.superType) == Number(_loc1_._superType))
            {
               if(_loc2_.m_ID != _loc1_.data.m_ID)
               {
                  if(_loc2_.canEquip)
                  {
                     if(!_loc1_.isEmpty)
                     {
                        _loc1_.broadcastMessage("onReplaceItem",_loc1_.data);
                     }
                     _loc1_.setItem(_loc2_);
                     _loc1_.onAddItem(_loc1_.data);
                     _loc3_.INTERFACE.lastSpellcursorData = null;
                  }
               }
            }
         }
      }
      else
      {
         _loc3_.INTERFACE.msgBox(Translator.getText("CANT_MOVE_ITEM_IN_GAME"));
      }
   }
   function press()
   {
      var _loc1_ = this;
      var _loc2_ = _global;
      if(!_loc2_.DATACENTER.Game.isFight)
      {
         if(!_loc1_.isEmpty)
         {
            _loc2_.INTERFACE.setSpellCursor(_loc1_._data);
            _loc1_.onMouseUp = function()
            {
               var _loc1_ = this;
               _global.INTERFACE.setSpellCursor(null);
               _loc1_.broadcastMessage("onTestMouse",_loc1_.data);
               _loc1_.broadcastMessage("onItemOff",_loc1_.data);
               delete _loc1_.onMouseUp;
            };
            Mouse.addListener(_loc1_);
            _loc1_.broadcastMessage("onItemPlacement",_loc1_.data);
         }
         _loc2_.INTERFACE.lastSpellcursorData = null;
      }
      else
      {
         _loc2_.INTERFACE.msgBox("Impossible de modifier l\'inventaire en combat.");
      }
   }
   function onSetItem(itemData)
   {
   }
   function onAddItem(itemData)
   {
      this.broadcastMessage("onEquipItem",itemData,this.positionID);
   }
}
