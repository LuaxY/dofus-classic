_global.DataProviderClass = function()
{
   this.init();
};
DataProviderClass.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.items = new Array();
   _loc1_.uniqueID = 0;
   _loc1_.views = new Array();
};
DataProviderClass.prototype.addView = function(viewRef)
{
   this.views.push(viewRef);
   var _loc1_ = {event:"updateAll"};
   viewRef.modelChanged(_loc1_);
};
DataProviderClass.prototype.addItemAt = function(index, value)
{
   var _loc1_ = index;
   var _loc2_ = this;
   var _loc3_ = value;
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
   _loc2_.items[_loc1_].__ID__ = _loc2_.uniqueID++;
   var eventObj = {event:"addRows",firstRow:_loc1_,lastRow:_loc1_};
   _loc2_.updateViews(eventObj);
};
DataProviderClass.prototype.addItem = function(value)
{
   this.addItemAt(this.getLength(),value);
};
DataProviderClass.prototype.removeItemAt = function(index)
{
   var _loc1_ = index;
   var _loc2_ = this;
   var tmpItm = _loc2_.items[_loc1_];
   _loc2_.items.splice(_loc1_,1);
   var _loc3_ = {event:"deleteRows",firstRow:_loc1_,lastRow:_loc1_};
   _loc2_.updateViews(_loc3_);
   return tmpItm;
};
DataProviderClass.prototype.removeAll = function()
{
   var _loc1_ = this;
   _loc1_.items = new Array();
   _loc1_.updateViews({event:"deleteRows",firstRow:0,lastRow:_loc1_.getLength() - 1});
};
DataProviderClass.prototype.replaceItemAt = function(index, itemObj)
{
   var _loc1_ = index;
   var _loc2_ = this;
   var _loc3_;
   if(!(_loc1_ < 0 || _loc1_ >= _loc2_.getLength()))
   {
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
DataProviderClass.prototype.getLength = function()
{
   return this.items.length;
};
DataProviderClass.prototype.getItemAt = function(index)
{
   return this.items[index];
};
DataProviderClass.prototype.getItemID = function(index)
{
   return this.items[index].__ID__;
};
DataProviderClass.prototype.sortItemsBy = function(fieldName, order)
{
   var _loc1_ = this;
   _loc1_.items.sortOn(fieldName);
   if(order == "DESC")
   {
      _loc1_.items.reverse();
   }
   _loc1_.updateViews({event:"sort"});
};
DataProviderClass.prototype.updateViews = function(eventObj)
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
