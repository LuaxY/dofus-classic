Class_Battlefield_Selection = function()
{
   this.init();
};
Class_Battlefield_Selection.prototype = new MovieClip();
Object.registerClass("Dofus::BattleField::Selection",Class_Battlefield_Selection);
Class_Battlefield_Selection.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.container = BATTLEFIELD.Container;
   _loc1_.map = BATTLEFIELD.Map;
   _loc1_.selectedCells = new Array();
};
Class_Battlefield_Selection.prototype.setVisible = function(bool)
{
   this.container.Selection._visible = bool;
};
Class_Battlefield_Selection.prototype.chgColor = function(cellNum, depth, col)
{
   var _loc1_ = "cell" + String(cellNum) + String(depth);
   this.container.Selection[_loc1_].c.setRGB(col);
};
Class_Battlefield_Selection.prototype.select = function(cellNum, bool, depth, col, txt)
{
   var _loc2_ = this;
   var _loc3_ = _loc2_.map.getData(cellNum);
   var _loc1_;
   if(_loc3_)
   {
      var cellName = "cell" + String(cellNum) + String(depth);
      if(bool)
      {
         _loc1_ = _loc2_.container.Selection.attachMovie("MC_Cell_Full",cellName,cellNum * 100 + depth);
         _loc1_._x = _loc2_.x * _loc2_.cell_width + _loc2_.dec;
         _loc1_._y = _loc2_.y * _loc2_.cell_height / 2 - 20 * (_loc3_.groundLevel - 7);
         _loc1_._x = _loc3_.x;
         _loc1_._y = _loc3_.y;
         _loc1_.c = new Color(_loc1_);
         _loc1_.c.setRGB(col);
         _loc1_.gotoAndStop(_loc3_.groundSlope);
         _loc2_.selectedCells.push(_loc1_);
      }
      else
      {
         _loc2_.container.Selection[cellName].removeMovieClip();
      }
   }
};
Class_Battlefield_Selection.prototype.unSelectAll = function()
{
   var _loc2_ = this;
   var c = _loc2_.container.Selection;
   var _loc3_ = _loc2_.selectedCells.length;
   var _loc1_ = 0;
   while(_loc1_ < _loc3_)
   {
      _loc2_.selectedCells[_loc1_].removeMovieClip();
      _loc1_ = _loc1_ + 1;
   }
   _loc2_.selectedCells = new Array();
};
Class_Battlefield_Selection.prototype.clearAll = function()
{
   var _loc1_ = this.container.Selection;
   for(var _loc2_ in _loc1_)
   {
      _loc1_[_loc2_].removeMovieClip();
   }
   this.selectedCells = new Array();
};
Class_Battlefield_Selection.prototype.selectAll = function(bool, depth, col)
{
   var _loc3_ = this;
   var _loc2_ = _loc3_.map.data.data.length;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_)
   {
      _loc3_.select(_loc1_,bool,depth,col);
      _loc1_ = _loc1_ + 1;
   }
};
ASSetPropFlags(Class_Battlefield_Selection.prototype,null,1,1);
