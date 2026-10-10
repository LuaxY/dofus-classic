function FListBoxClass()
{
   var _loc1_ = this;
   _loc1_.init();
   if(_loc1_._parent[_loc1_.extScrollBar] != undefined)
   {
      _loc1_.setExtScrollBar(_loc1_._parent[_loc1_.extScrollBar]);
   }
   _loc1_.permaScrollBar = true;
   var _loc2_ = 0;
   while(_loc2_ < _loc1_.labels.length)
   {
      _loc1_.addItem(_loc1_.labels[_loc2_],_loc1_.data[_loc2_]);
      _loc2_ = _loc2_ + 1;
   }
   _loc1_.boundingBox_mc.gotoAndStop(1);
   _loc1_.width = _loc1_._width;
   _loc1_.height = _loc1_._height;
   _loc1_._yscale = _loc1_._xscale = 100;
   _loc1_.setSize(_loc1_.width,_loc1_.height);
   if(_loc1_.changeHandler.length > 0)
   {
      _loc1_.setChangeHandler(_loc1_.changeHandler);
   }
}; //unpopped
FListBoxClass.prototype = new FScrollSelectListClass();
Object.registerClass("Ank::Dofus::ListBox",FListBoxClass);
FListBoxClass.prototype.getSelectedIndices = function()
{
   var _loc1_ = this;
   var _loc2_ = new Array();
   for(var _loc3_ in _loc1_.selected)
   {
      _loc2_.push(_loc1_.selected[_loc3_].sIndex);
   }
   if(_loc2_.length <= 0)
   {
      return undefined;
   }
   return _loc2_;
};
FListBoxClass.prototype.getSelectedItems = function()
{
   var _loc2_ = this.getSelectedIndices();
   var _loc3_ = new Array();
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.length)
   {
      _loc3_.push(this.getItemAt(_loc2_[_loc1_]));
      _loc1_ = _loc1_ + 1;
   }
   if(_loc3_.length <= 0)
   {
      return undefined;
   }
   return _loc3_;
};
FListBoxClass.prototype.getSelectMultiple = function()
{
   return this.selectMultiple;
};
FListBoxClass.prototype.getRowCount = function()
{
   return this.numDisplayed;
};
FListBoxClass.prototype.setSelectedIndices = function(indexArray)
{
   var _loc2_ = indexArray;
   var _loc3_ = this;
   _loc3_.clearSelected();
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.length)
   {
      _loc3_.selectItem(_loc2_[_loc1_],true);
      _loc1_ = _loc1_ + 1;
   }
   _loc3_.updateControl();
};
FListBoxClass.prototype.setSelectMultiple = function(flag)
{
   this.selectMultiple = flag;
};
FListBoxClass.prototype.setRowCount = function(count)
{
   var _loc2_ = this;
   var _loc1_ = count * (_loc2_.itmHgt - 2) + 2;
   _loc2_.setSize(_loc2_.width,_loc1_);
};
FListBoxClass.prototype.setWidth = function(wdt)
{
   this.setSize(wdt,this.height);
};
FListBoxClass.prototype.setExtScrollBar = function(extScrollBar)
{
   this.extScrollBar_mc = extScrollBar;
};
FListBoxClass.prototype.setSize = function(w, h)
{
   var _loc1_ = this;
   var _loc2_ = w;
   var _loc3_ = h;
   if(_loc1_.enable)
   {
      _loc2_ = Math.max(_loc2_,20);
      _loc3_ = Math.max(_loc3_,40);
      _loc1_.container_mc.removeMovieClip();
      _loc1_.container_mc = _loc1_.createEmptyMovieClip("container",3);
      _loc1_.measureItmHgt();
      _loc1_.numDisplayed = Math.floor(_loc3_ / (_loc1_.itmHgt - 2));
      _loc1_.height = _loc1_.numDisplayed * (_loc1_.itmHgt - 2) + 2;
      _loc1_.popupWidth = _loc2_;
      super.setSize(_loc2_,_loc1_.height);
   }
};
FListBoxClass.prototype.removeItemAt = function(index)
{
   this.selectHolder = this.getSelectedIndices();
   return super.removeItemAt(index);
};
FListBoxClass.prototype.selectionHandler = function(itemNum)
{
   var _loc1_ = this;
   var _loc3_;
   var _loc2_;
   if(_loc1_.clickFilter)
   {
      _loc3_ = _loc1_.topDisplayed + itemNum;
      if(_loc1_.getItemAt(_loc3_) == undefined)
      {
         _loc1_.changeFlag = false;
      }
      else
      {
         _loc1_.changeFlag = true;
         if(!_loc1_.selectMultiple && !Key.isDown(17) || !Key.isDown(16) && !Key.isDown(17))
         {
            _loc1_.clearSelected();
            _loc1_.selectItem(_loc3_,true);
            _loc1_.lastSelected = _loc3_;
            _loc1_.container_mc["fListItem" + itemNum + "_mc"].drawItem(_loc1_.getItemAt(_loc3_),_loc1_.isSelected(_loc3_));
         }
         else if(Key.isDown(16) && _loc1_.selectMultiple)
         {
            if(_loc1_.lastSelected == -1)
            {
               _loc1_.lastSelected = _loc3_;
            }
            var incr = _loc1_.lastSelected >= _loc3_ ? -1 : 1;
            _loc1_.clearSelected();
            _loc2_ = _loc1_.lastSelected;
            while(_loc2_ != _loc3_)
            {
               _loc1_.selectItem(_loc2_,true);
               if(_loc2_ >= _loc1_.topDisplayed && _loc2_ < _loc1_.topDisplayed + _loc1_.numDisplayed)
               {
                  _loc1_.container_mc["fListItem" + (_loc2_ - _loc1_.topDisplayed) + "_mc"].drawItem(_loc1_.getItemAt(_loc2_),_loc1_.isSelected(_loc2_));
               }
               _loc2_ += incr;
            }
            _loc1_.selectItem(_loc3_,true);
            _loc1_.container_mc["fListItem" + (_loc3_ - _loc1_.topDisplayed) + "_mc"].drawItem(_loc1_.getItemAt(_loc3_),_loc1_.isSelected(_loc3_));
         }
         else if(key.isDown(17))
         {
            var selectedFlag = _loc1_.isSelected(_loc3_);
            if(!_loc1_.selectMultiple)
            {
               _loc1_.clearSelected();
            }
            if(!(!_loc1_.selectMultiple && selectedFlag))
            {
               _loc1_.selectItem(_loc3_,!selectedFlag);
               _loc1_.container_mc["fListItem" + itemNum + "_mc"].drawItem(_loc1_.getItemAt(_loc1_.topDisplayed + itemNum),_loc1_.isSelected(_loc1_.topDisplayed + itemNum));
            }
            _loc1_.lastSelected = _loc3_;
         }
      }
   }
   else
   {
      _loc1_.clickFilter = true;
   }
};
FListBoxClass.prototype.moveSelBy = function(itemNum)
{
   super.moveSelBy(itemNum);
   this.releaseHandler();
};
