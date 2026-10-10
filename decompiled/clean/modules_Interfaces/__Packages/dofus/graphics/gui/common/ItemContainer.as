class dofus.graphics.gui.common.ItemContainer extends MovieClip
{
   var _bEmpty;
   var _data;
   var swfLoader_mc;
   static var MARGIN = 5;
   function ItemContainer()
   {
      super();
   }
   function get isEmpty()
   {
      return this._bEmpty;
   }
   function set isEmpty(bool)
   {
      this._bEmpty = bool;
   }
   function initialize()
   {
      var _loc1_ = this;
      AsBroadcaster.initialize(_loc1_);
      var _loc2_ = _loc1_.getBounds();
      _loc1_._saveWidth = Math.abs(_loc2_.xMin) + Math.abs(_loc2_.xMax) - 2 * dofus.graphics.gui.common.ItemContainer.MARGIN;
      _loc1_._saveHeight = Math.abs(_loc2_.yMin) + Math.abs(_loc2_.yMax) - 2 * dofus.graphics.gui.common.ItemContainer.MARGIN;
      _loc1_._data = null;
      _loc1_.attachClassMovie(ank.SWFLoader,"swfLoader_mc",10);
      _loc1_.swfLoader_mc.addListener(_loc1_);
      _loc1_.isEmpty = true;
      _loc1_.trackAsMenu = true;
   }
   function setItem(itemData)
   {
      var _loc1_ = this;
      var _loc2_ = itemData;
      _loc1_._saveData = _loc1_._data;
      _loc1_._data = _loc2_;
      _loc1_._data.position = _loc1_._name;
      if(_loc2_ != null)
      {
         _loc1_.useHandCursor = true;
         _loc1_.swfLoader_mc.clear();
         _loc1_.swfLoader_mc.loadSWF(_loc2_.iconFile);
         _loc1_.isEmpty = false;
      }
      else
      {
         _loc1_.useHandCursor = false;
         _loc1_.swfLoader_mc.clear();
         _loc1_.isEmpty = true;
      }
      return _loc1_._saveData;
   }
   function setEnabled(bool)
   {
      var _loc1_ = this;
      _loc1_._bEnabled = bool;
      if(bool)
      {
         _loc1_.onRelease = _loc1_.release;
         _loc1_.onPress = _loc1_.press;
         _loc1_.onRollOver = _loc1_.onDragOver = _loc1_.rollOver;
         _loc1_.onRollOut = _loc1_.onDragOut = _loc1_.rollOut;
      }
      else
      {
         delete _loc1_.onRelease;
         delete _loc1_.onPress;
         delete _loc1_.onRollOver;
         delete _loc1_.onRollOut;
         delete _loc1_.onDragOver;
         delete _loc1_.onDragOut;
      }
   }
   function onLoadComplete(item_mc)
   {
      var _loc1_ = item_mc;
      var _loc3_ = this;
      if(_loc1_._width > _loc1_._height)
      {
         _loc1_._width = _loc3_._saveWidth;
         _loc1_._yscale = _loc1_._xscale;
      }
      else
      {
         _loc1_._height = _loc3_._saveHeight;
         _loc1_._xscale = _loc1_._yscale;
      }
      _loc1_._x = _loc1_._y = 0;
      var _loc2_ = _loc1_.getBounds(_loc3_);
      _loc1_._x = - _loc1_._width / 2 - _loc2_.xMin;
      _loc1_._y = - _loc1_._height / 2 - _loc2_.yMin;
   }
   function get getItem()
   {
      return this.swfLoader_mc;
   }
   function get data()
   {
      return this._data;
   }
}
