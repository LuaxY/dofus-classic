_global.DofusDataProviderClass = function()
{
   this.init();
};
DofusDataProviderClass.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.items = new Array();
   _loc1_.keys = new Object();
   _loc1_.uniqueID = 0;
   _loc1_.views = new Array();
};
DofusDataProviderClass.prototype.addView = function(viewRef)
{
   this.views.push(viewRef);
   var _loc1_ = {event:"updateAll"};
   viewRef.modelChanged(_loc1_);
};
DofusDataProviderClass.prototype.addItemAt = function(index, value)
{
   var _loc1_ = index;
   var _loc2_ = this;
   var _loc3_ = value;
   _loc2_.keys[_loc1_] = null;
   if(_loc1_ < _loc2_.getLength())
   {
      _loc2_.items.splice(_loc1_,0,"tmp");
   }
   _loc2_.items[_loc1_] = new Object();
   if(typeof _loc3_ == "object")
   {
      _loc2_.items[_loc1_] = _loc3_;
   }
   else
   {
      _loc2_.items[_loc1_].label = _loc3_;
   }
   _loc2_.items[_loc1_].index = _loc1_;
   _loc2_.items[_loc1_].__ID__ = _loc2_.uniqueID++;
   var eventObj = {event:"addRows",firstRow:_loc1_,lastRow:_loc1_};
   _loc2_.updateViews(eventObj);
};
DofusDataProviderClass.prototype.addItem = function(value)
{
   this.addItemAt(this.getLength(),value);
};
DofusDataProviderClass.prototype.removeItemAt = function(index)
{
   var _loc1_ = index;
   var _loc2_ = this;
   delete _loc2_.keys[_loc1_];
   var tmpItm = _loc2_.items[_loc1_];
   _loc2_.items.splice(_loc1_,1);
   var _loc3_ = {event:"deleteRows",firstRow:_loc1_,lastRow:_loc1_};
   _loc2_.updateViews(_loc3_);
   return tmpItm;
};
DofusDataProviderClass.prototype.removeAll = function()
{
   var _loc1_ = this;
   _loc1_.keys = new Object();
   _loc1_.items = new Array();
   _loc1_.updateViews({event:"deleteRows",firstRow:0,lastRow:_loc1_.getLength() - 1});
};
DofusDataProviderClass.prototype.replaceItemAt = function(index, itemObj)
{
   var _loc1_ = index;
   var _loc2_ = this;
   var _loc3_;
   if(!(_loc1_ < 0 || _loc1_ >= _loc2_.getLength()))
   {
      _loc2_.keys[_loc1_] = null;
      _loc3_ = _loc2_.getItemID(_loc1_);
      if(typeof itemObj == "object")
      {
         _loc2_.items[_loc1_] = itemObj;
      }
      else
      {
         _loc2_.items[_loc1_].label = itemObj;
      }
      _loc2_.items[_loc1_].__ID__ = _loc3_;
      _loc2_.updateViews({event:"updateRows",firstRow:_loc1_,lastRow:_loc1_});
   }
};
DofusDataProviderClass.prototype.setItemAt = function(index, itemObj)
{
   var _loc1_ = index;
   var _loc2_ = this;
   if(_loc1_ >= 0)
   {
      if(_loc1_ >= _loc2_.getLength())
      {
         return _loc2_.addItemAt(_loc1_,itemObj);
      }
      _loc2_.replaceItemAt(_loc1_,itemObj);
   }
};
DofusDataProviderClass.prototype.deleteItemAt = function(index)
{
   delete this.keys[index];
   this.items[index] = undefined;
};
DofusDataProviderClass.prototype.getLength = function()
{
   return this.items.length;
};
DofusDataProviderClass.prototype.getItemIndex = function(value, param)
{
   var _loc2_ = this;
   var _loc3_ = new Array();
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.items.length)
   {
      if(_loc2_.items[_loc1_][param] == value)
      {
         _loc3_.push(_loc1_);
      }
      _loc1_ = _loc1_ + 1;
   }
   return _loc3_;
};
DofusDataProviderClass.prototype.getItemAt = function(index)
{
   return this.items[index];
};
DofusDataProviderClass.prototype.getItemID = function(index)
{
   return this.items[index].__ID__;
};
DofusDataProviderClass.prototype.sortItemsBy = function(fieldName, order)
{
   var _loc1_ = this;
   _loc1_.items.sortOn(fieldName);
   if(order == "DESC")
   {
      _loc1_.items.reverse();
   }
   _loc1_.updateViews({event:"sort"});
};
DofusDataProviderClass.prototype.moveItem = function(indexFrom, indexTo)
{
   var _loc1_ = this;
   var _loc2_;
   var itemReturn;
   _loc2_ = _loc1_.items[indexFrom];
   _loc1_.items[indexFrom] = null;
   itemReturn = _loc1_.items[indexTo];
   _loc1_.items[indexTo] = _loc2_;
};
DofusDataProviderClass.prototype.updateViews = function(eventObj)
{
   var _loc2_ = this;
   var _loc3_ = eventObj;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.views.length)
   {
      _loc2_.views[_loc1_].modelChanged(_loc3_);
      _loc1_ = _loc1_ + 1;
   }
};
ASSetPropFlags(DofusDataProviderClass.prototype,null,1,1);
