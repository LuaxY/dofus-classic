class dofus.graphics.gui.common.InventoryItemContainer extends dofus.graphics.gui.common.ItemContainer
{
   var broadcastMessage;
   var data;
   function InventoryItemContainer()
   {
      super();
      this.initialize();
   }
   function initialize()
   {
      super.initialize();
   }
   function rollOver()
   {
      this.broadcastMessage("onItemRollOver",this.data);
   }
   function rollOut()
   {
      this.broadcastMessage("onItemRollOut",this.data);
   }
   function press()
   {
      var _loc1_ = this;
      var _loc2_ = _global;
      if(!_loc2_.DATACENTER.Game.isFight)
      {
         if(!_loc1_.isEmpty)
         {
            _loc1_.broadcastMessage("onItemRollOver",_loc1_.data);
            _loc2_.INTERFACE.setSpellCursor(_loc1_._data);
            _loc1_.onMouseUp = function()
            {
               var _loc1_ = this;
               _global.INTERFACE.setSpellCursor(null);
               _loc1_.broadcastMessage("onItemRollOut",_loc1_.data);
               delete _loc1_.onMouseUp;
            };
            Mouse.addListener(_loc1_);
         }
      }
      else
      {
         _loc2_.INTERFACE.msgBox(dofus.Translator.getText("CANT_MOVE_ITEM_IN_GAME"));
      }
   }
}
