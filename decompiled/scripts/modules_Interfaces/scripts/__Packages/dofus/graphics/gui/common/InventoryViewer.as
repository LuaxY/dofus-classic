class dofus.graphics.gui.common.InventoryViewer extends MovieClip
{
   var drop_mc;
   var inventoryScroller_mc;
   var inventory_mc;
   static var SQUARE_COUNT = 6;
   function InventoryViewer()
   {
      super();
      this.initialize();
   }
   function initialize()
   {
      var _loc1_ = this;
      _global.DATACENTER.Player.addListener(_loc1_);
      _loc1_.onEnterFrame = function()
      {
         var _loc1_ = this;
         _loc1_.refresh();
         _loc1_.inventoryScroller_mc.addListener(_loc1_);
         _loc1_.onItemInfos(_loc1_.inventoryScroller_mc.selectedItem);
         _loc1_.equipement0_mc.addListener(_loc1_);
         _loc1_.equipement1_mc.addListener(_loc1_);
         _loc1_.equipement2_mc.addListener(_loc1_);
         _loc1_.equipement3_mc.addListener(_loc1_);
         _loc1_.equipement4_mc.addListener(_loc1_);
         _loc1_.equipement5_mc.addListener(_loc1_);
         _loc1_.drop_mc.addListener(_loc1_);
         _loc1_.inventory_mc.addListener(_loc1_);
         _loc1_.filter0_mc.addListener(_loc1_);
         _loc1_.filter1_mc.addListener(_loc1_);
         _loc1_.filter2_mc.addListener(_loc1_);
         _loc1_.filter3_mc.addListener(_loc1_);
         _loc1_.filter4_mc.addListener(_loc1_);
         _loc1_.filter0_mc.select(true);
         _loc1_.filter1_mc.select(true);
         _loc1_.filter2_mc.select(true);
         _loc1_.filter3_mc.select(true);
         _loc1_.filter4_mc.select(true);
         delete _loc1_.onEnterFrame;
      };
   }
   function refresh()
   {
      this.inventoryScroller_mc.generate();
      var _loc2_;
      var _loc1_;
      var _loc3_ = _global.DATACENTER.Player.Inventory;
      _loc2_ = 0;
      while(_loc2_ < _loc3_.length)
      {
         _loc1_ = _loc3_[_loc2_];
         if(_loc1_.m_Position != -1)
         {
            this["equipement" + _loc1_.m_Position + "_mc"].setItem(_loc1_,true);
         }
         _loc2_ = _loc2_ + 1;
      }
   }
   function selectByType(itemData)
   {
      var _loc3_;
      var _loc1_;
      var count = 0;
      var superType = itemData.superType;
      var _loc2_;
      _loc3_ = 0;
      while(_loc3_ < dofus.graphics.gui.common.InventoryViewer.SQUARE_COUNT)
      {
         _loc1_ = this["equipement" + _loc3_ + "_mc"];
         if(superType == undefined)
         {
            _loc1_.setEnabled(true);
            _loc1_.selectBlink(false);
            count = 1;
         }
         else
         {
            _loc2_ = _loc1_.superType == superType && itemData.canEquip;
            _loc1_.setEnabled(_loc2_);
            _loc1_.selectBlink(_loc2_);
            if(_loc2_)
            {
               count++;
            }
         }
         _loc3_ = _loc3_ + 1;
      }
      this.inventory_mc.setEnabled(true);
      if(count == 0)
      {
         _global.INTERFACE.drawToolTip(dofus.Translator.getText("CANT_EQUIP"),0,-10,true,true);
      }
      else
      {
         _global.INTERFACE.hideToolTip();
      }
   }
   function updateInventory(itemData, position, bGenerate)
   {
      var _loc1_ = itemData;
      var _loc2_ = bGenerate;
      var _loc3_ = position;
      if(_loc2_ == undefined)
      {
         _loc2_ = true;
      }
      if(_loc3_ == undefined)
      {
         _loc3_ = -1;
      }
      if(_loc1_.m_Position != -1 && _loc1_.m_Position != -2)
      {
         this["equipement" + _loc1_.m_Position + "_mc"].setItem(null);
      }
      _loc1_.m_Position = _loc3_;
      if(_loc2_)
      {
         this.inventoryScroller_mc.generate();
      }
   }
   function onInventoryChange()
   {
      this.refresh();
   }
   function onItemInfos(itemData)
   {
      var _loc1_ = this;
      if(itemData != null)
      {
         _loc1_.objectInfosViewer_mc.view(itemData);
      }
      else
      {
         _loc1_.objectInfosViewer_mc.view(_loc1_.inventoryScroller_mc.selectedItem);
      }
   }
   function onItemPlacement(itemData)
   {
      this.selectByType(itemData);
   }
   function onItemOff(itemData)
   {
      if(_global.INTERFACE.getSpellCursor() == undefined)
      {
         this.selectByType(null);
      }
   }
   function onEquipItem(itemData, position)
   {
      this.updateInventory(itemData,position);
      _global.AKS.Items.movement(itemData.m_ID,position);
   }
   function onReplaceItem(itemData)
   {
      this.updateInventory(itemData,-1,false);
   }
   function onDropItem(itemData)
   {
      var _loc1_ = _global;
      var iv = this;
      _loc1_.INTERFACE.onQuestionBoxYes = function()
      {
         _global.AKS.Items.drop(itemData.m_ID);
      };
      _loc1_.INTERFACE.questionBox(dofus.Translator.getText("DO_U_DROP",[itemData.name]));
   }
   function onSelect(button)
   {
      var _loc3_ = this;
      var _loc2_ = button.params;
      var _loc1_;
      _loc1_ = 0;
      while(_loc1_ < _loc2_.length)
      {
         _loc3_.inventoryScroller_mc.changeFilterType(_loc2_[_loc1_],button.selected);
         _loc1_ = _loc1_ + 1;
      }
      _loc3_.inventoryScroller_mc.generate();
   }
   function onToolTipOn(mc)
   {
      var txt;
      var _loc1_;
      var _loc2_ = mc.params;
      var _loc3_ = _loc2_.length;
      var hideShow = !mc.selected ? dofus.Translator.getText("SHOW") : dofus.Translator.getText("HIDE");
      _loc1_ = 0;
      while(_loc1_ < _loc3_)
      {
         txt += ", " + _global.getItemSuperTypeText(_loc2_[_loc1_]);
         _loc1_ = _loc1_ + 1;
      }
      _global.INTERFACE.drawToolTip(hideShow + " (" + txt.substr(2) + ")",0,-10,true,false);
   }
   function onToolTipOff(mc)
   {
      _global.INTERFACE.hideToolTip();
   }
   function onTestMouse(itemData)
   {
      var _loc1_;
      var _loc2_;
      var _loc3_ = false;
      if(!this.drop_mc.hitTest(_level0._xmouse,_level0._ymouse,false))
      {
         _loc1_ = 0;
         while(_loc1_ < dofus.graphics.gui.common.InventoryViewer.SQUARE_COUNT)
         {
            _loc2_ = this["equipement" + _loc1_ + "_mc"];
            if(_loc2_.hitTest(_level0._xmouse,_level0._ymouse,false))
            {
               _loc3_ = true;
               break;
            }
            _loc1_ = _loc1_ + 1;
         }
         if(!_loc3_)
         {
            this.onEquipItem(itemData,-1);
         }
      }
   }
}
