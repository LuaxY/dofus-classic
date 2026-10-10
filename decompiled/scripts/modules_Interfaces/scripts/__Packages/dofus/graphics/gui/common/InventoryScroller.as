class dofus.graphics.gui.common.InventoryScroller extends MovieClip
{
   var _filter;
   var _itemCount;
   var _selectedIndex;
   var broadcastMessage;
   var scroller_mc;
   static var ITEM_SPACER = 50;
   static var ITEM_SYMBOL = "InventoryItemContainer";
   function InventoryScroller()
   {
      super();
      this.initialize();
   }
   function get selectedIndex()
   {
      return this._selectedIndex;
   }
   function get selectedItem()
   {
      return this.scroller_mc["item" + this.selectedIndex + "_mc"].data;
   }
   function get count()
   {
      return this._itemCount;
   }
   function initialize()
   {
      AsBroadcaster.initialize(this);
      this._filter = new Array();
   }
   function generate()
   {
      var _loc1_ = this;
      _loc1_.scroller_mc.removeMovieClip();
      _loc1_.createEmptyMovieClip("scroller_mc",10);
      _loc1_._inventory = _global.DATACENTER.Player.Inventory;
      _loc1_._itemCount = 0;
      var _loc3_;
      var _loc2_ = 0;
      while(_loc2_ < _loc1_._inventory.length)
      {
         if(_loc1_.isFiltred(_loc1_._inventory[_loc2_].superType) && _loc1_._inventory[_loc2_].m_Position == -1)
         {
            _loc3_ = _loc1_.scroller_mc.attachMovie(dofus.graphics.gui.common.InventoryScroller.ITEM_SYMBOL,"item" + _loc1_.count + "_mc",10 * _loc1_.count,{_x:_loc1_.count * dofus.graphics.gui.common.InventoryScroller.ITEM_SPACER});
            _loc3_.addListener(_loc1_);
            _loc3_.setItem(_loc1_._inventory[_loc2_]);
            _loc1_._itemCount = _loc1_._itemCount + 1;
         }
         _loc2_ = _loc2_ + 1;
      }
      _loc1_._selectedIndex = 0;
      _loc1_._destX = 0;
      _loc1_.finalizeScroll(1);
   }
   function changeFilterType(typeID, value)
   {
      this._filter[typeID] = value;
   }
   function move(bRight)
   {
      var _loc1_ = this;
      var dir = !bRight ? -1 : 1;
      _loc1_._selectedIndex -= dir;
      var _loc2_;
      if(_loc1_._selectedIndex >= _loc1_.count)
      {
         _loc1_._selectedIndex = 0;
         _loc1_._destX = 0;
         dir *= -1;
      }
      else if(_loc1_._selectedIndex < 0)
      {
         _loc1_._selectedIndex = _loc1_.count - 1;
         _loc1_._destX = (- (_loc1_.count - 1)) * dofus.graphics.gui.common.InventoryScroller.ITEM_SPACER;
         dir *= -1;
      }
      else
      {
         _loc2_ = dofus.graphics.gui.common.InventoryScroller.ITEM_SPACER * dir;
         _loc1_._destX = _loc1_._destX == undefined ? _loc1_.scroller_mc._x + _loc2_ : _loc1_._destX + _loc2_;
      }
      var i = 0;
      _loc1_.onEnterFrame = function()
      {
         var _loc1_ = this;
         i++;
         _loc1_.scroller_mc._x += i * i * dir;
         _loc1_.scaleScroller(- _loc1_.scroller_mc._x);
         if(_loc1_.scroller_mc._x * dir > _loc1_._destX * dir)
         {
            _loc1_.finalizeScroll(- _loc1_.scroller_mc._x);
            delete _loc1_.onEnterFrame;
         }
         _loc1_.scaleScroller(- _loc1_.scroller_mc._x);
      };
   }
   function scaleScroller(x)
   {
      var _loc2_;
      var col;
      var _loc3_;
      var _loc1_;
      var dist;
      _loc3_ = 0;
      while(_loc3_ < this.count)
      {
         _loc2_ = this.scroller_mc["item" + _loc3_ + "_mc"];
         dist = Math.abs(_loc2_._x - x);
         _loc1_ = 100 - Math.min(50,dist);
         _loc2_._xscale = _loc2_._yscale = _loc1_;
         _loc2_.swapDepths(_loc1_);
         if(dist > 90)
         {
            _loc2_._visible = false;
         }
         else
         {
            _loc2_._visible = true;
         }
         col = new Color(_loc2_);
         if(_loc1_ < 95)
         {
            col.setTransform({ra:_loc1_,rb:"2",ga:_loc1_,gb:"65",ba:_loc1_,bb:"111",aa:_loc1_,ab:"0"});
         }
         else
         {
            col.setTransform({ra:"100",rb:"0",ga:"100",gb:"0",ba:"100",bb:"0",aa:"100",ab:"0"});
         }
         _loc3_ = _loc3_ + 1;
      }
   }
   function finalizeScroll(x)
   {
      var _loc2_ = this;
      var _loc1_;
      var _loc3_;
      _loc1_ = 0;
      while(_loc1_ < _loc2_.count)
      {
         _loc3_ = _loc2_.scroller_mc["item" + _loc1_ + "_mc"];
         _loc3_.setEnabled(false);
         _loc1_ = _loc1_ + 1;
      }
      _loc3_ = _loc2_.scroller_mc["item" + _loc2_.selectedIndex + "_mc"];
      _loc3_.setEnabled(true);
      _loc2_.scaleScroller(x);
      _loc2_.scroller_mc._x = _loc2_._destX;
      _loc2_.broadcastMessage("onItemInfos",_loc3_.data);
   }
   function isFiltred(type)
   {
      return !(this._filter[type] == true || this._filter[type] == undefined) ? false : true;
   }
   function onItemRollOver(itemData)
   {
      this.broadcastMessage("onItemPlacement",itemData);
   }
   function onItemRollOut(itemData)
   {
      this.broadcastMessage("onItemOff",itemData);
   }
}
