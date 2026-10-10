Class_InterfaceBannerContainer = function()
{
   this.init();
};
Class_InterfaceBannerContainer.prototype = new MovieClip();
Object.registerClass("Interface::Banner::Container",Class_InterfaceBannerContainer);
Class_InterfaceBannerContainer.prototype.init = function()
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.getBounds();
   _loc1_.saveWidth = 2 * _loc2_.xMin + _loc2_.xMax;
   _loc1_.saveHeight = 2 * _loc2_.yMin + _loc2_.yMax;
   _loc1_.margin = 0;
   _loc1_.data = null;
   _loc1_.depth = 10;
   _loc1_.selectClip = "SquareSelectItem";
   _loc1_.trackAsMenu = true;
};
Class_InterfaceBannerContainer.prototype.setItem = function(itemData)
{
   var _loc1_ = this;
   var _loc3_ = itemData;
   _loc1_.saveData = _loc1_.data;
   _loc1_.data = _loc3_;
   _loc1_.data.position = _loc1_._name;
   if(_loc3_ != null)
   {
      _loc1_.useHandCursor = true;
      _loc3_.lastHolder = _loc1_;
      _loc1_.item.removeMovieClip();
      _loc1_.createEmptyMovieClip("item",10);
      _loc1_.item.onInitFrame = function()
      {
         var _loc1_ = this;
         if(_loc1_._width > _loc1_._height)
         {
            _loc1_._height = _loc1_._height * (_loc1_._parent.saveWidth - _loc1_._parent.margin) / _loc1_._width;
            _loc1_._width = _loc1_._parent.saveWidth - _loc1_._parent.margin;
         }
         else
         {
            _loc1_._width = _loc1_._width * (_loc1_._parent.saveHeight - _loc1_._parent.margin) / _loc1_._height;
            _loc1_._height = _loc1_._parent.saveHeight - _loc1_._parent.margin;
         }
         var _loc2_ = _loc1_.getBounds(_loc1_._parent);
         _loc1_._x = (_loc1_._parent.saveWidth - _loc1_._width) / 2 - _loc2_.xMin;
         _loc1_._y = (_loc1_._parent.saveHeight - _loc1_._height) / 2 - _loc2_.yMin;
         if(_loc1_._parent.saveData != null)
         {
            _loc1_._parent.onRemoveItem(_loc1_._parent.saveData);
         }
         _loc1_._parent.onSetItem(_loc1_._parent.data);
      };
      _loc1_.item.loadMovie(_loc3_.iconFile);
   }
   else
   {
      _loc1_.useHandCursor = false;
      _loc1_.item.removeMovieClip();
      if(_loc1_.saveData != null)
      {
         _loc1_.onRemoveItem(_loc1_.saveData);
      }
   }
   return _loc1_.saveData;
};
Class_InterfaceBannerContainer.prototype.getItem = function()
{
   return this.item;
};
Class_InterfaceBannerContainer.prototype.getData = function()
{
   return this.data;
};
Class_InterfaceBannerContainer.prototype.isEmpty = function()
{
   if(this.data != null)
   {
      return false;
   }
   return true;
};
Class_InterfaceBannerContainer.prototype.setSelectClip = function(selectClip)
{
   this.selectClip = "InterfacePlayerItemsInventorySquareSelect";
};
Class_InterfaceBannerContainer.prototype.select = function(bool, text)
{
   var _loc1_ = this;
   var _loc2_ = bool;
   if(BATTLEFIELD.Interaction.getType() != 4)
   {
      if(_loc2_ == undefined)
      {
         _loc2_ = !_loc1_.selection ? true : false;
      }
      if(_loc2_)
      {
         _loc1_.attachMovie(_loc1_.selectClip,"selection",2000);
         if(text != undefined)
         {
            INTERFACE.drawToolTip(text,10,-10,true);
         }
      }
      else
      {
         _loc1_.selection.removeMovieClip();
         INTERFACE.hideToolTip();
      }
   }
};
Class_InterfaceBannerContainer.prototype.onSetItem = function(itemData)
{
   this._parent._parent._parent.onSetItem(itemData);
};
Class_InterfaceBannerContainer.prototype.onRemoveItem = function(itemData)
{
   this._parent._parent._parent.onRemoveItem(itemData);
};
