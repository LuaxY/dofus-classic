Class_Battlefield_Interaction = function()
{
   var _loc1_ = this;
   _loc1_.STATE_NONE = 0;
   _loc1_.STATE_RELEASE = 1;
   _loc1_.STATE_OVER_OUT = 2;
   _loc1_.STATE_RELEASE_OVER_OUT = 3;
   _loc1_.init();
};
Class_Battlefield_Interaction.prototype = new MovieClip();
Object.registerClass("Dofus::BattleField::Interaction",Class_Battlefield_Interaction);
Class_Battlefield_Interaction.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.type = 1;
   _loc1_.allTypes = {move:1,spell:2,cc:3,place:4};
   _loc1_.container = BATTLEFIELD.Container;
   _loc1_.map = BATTLEFIELD.Map;
   _loc1_.lastActionTime = 0;
   _loc1_.canLaunchSpell = false;
   _loc1_.errorMessage = undefined;
   _loc1_.currentState = _loc1_.STATE_NONE;
};
Class_Battlefield_Interaction.prototype.addCellNum = function(cellNum, layerID)
{
   var _loc1_ = this.map.getData(cellNum);
   this.addCell(cellNum,_loc1_.x,_loc1_.y,layerID,_loc1_.groundFrame);
};
Class_Battlefield_Interaction.prototype.addCell = function(cellNum, cell_x, cell_y, layerID, groundFrame)
{
   var _loc2_ = cellNum;
   var _loc3_ = this.container.Interaction["layer" + layerID];
   _loc3_.attachMovie("Dofus::Cell","cell" + _loc2_,_loc2_);
   var _loc1_ = _loc3_["cell" + _loc2_];
   _loc1_._xscale = _loc1_._yscale = 105;
   _loc1_._x = cell_x;
   _loc1_._y = cell_y;
   if(groundFrame != 1)
   {
      _loc1_.gotoAndStop(groundFrame);
   }
   _loc1_.num = _loc2_;
};
Class_Battlefield_Interaction.prototype.delCell = function(cellNum, layerID)
{
   this.container.Interaction["layer" + layerID]["cell" + cellNum].removeMovieClip();
};
Class_Battlefield_Interaction.prototype.onPressFct = function()
{
   BATTLEFIELD.Interaction.onCellPress(this.num);
};
Class_Battlefield_Interaction.prototype.onReleaseFct = function()
{
   BATTLEFIELD.Interaction.onCellRelease(this.num);
};
Class_Battlefield_Interaction.prototype.onRollOverFct = function()
{
   BATTLEFIELD.Interaction.onCellRollOver(this.num);
};
Class_Battlefield_Interaction.prototype.onRollOutFct = function()
{
   BATTLEFIELD.Interaction.onCellRollOut(this.num);
};
Class_Battlefield_Interaction.prototype.onReleaseOutsideFct = function()
{
   BATTLEFIELD.Interaction.onCellRelease(this.num);
   BATTLEFIELD.Interaction.onCellRollOut(this.num);
};
Class_Battlefield_Interaction.prototype.setLayerVisible = function(bool, layerID)
{
   this.container.Interaction["layer" + layerID]._visible = bool;
};
Class_Battlefield_Interaction.prototype.hideInteractions = function(bool)
{
   var _loc1_ = this;
   delete _loc1_.onMouseUp;
   Mouse.removeListener(_loc1_);
   if(bool)
   {
      _loc1_.setEnabledAll(false);
   }
   else
   {
      _loc1_.setEnabled(_loc1_.currentState);
   }
};
Class_Battlefield_Interaction.prototype.setEnabled = function(state)
{
   var _loc1_ = this;
   _loc1_.currentState = state;
   switch(state)
   {
      case _loc1_.STATE_NONE:
         _loc1_.setEnabledAll(false);
         return;
      case _loc1_.STATE_RELEASE:
         _loc1_.setEnabledRelease(true);
         _loc1_.setEnabledOverOut(false);
         return;
      case _loc1_.STATE_OVER_OUT:
         _loc1_.setEnabledRelease(false);
         _loc1_.setEnabledOverOut(true);
         return;
      case _loc1_.STATE_RELEASE_OVER_OUT:
         _loc1_.setEnabledAll(true);
         return;
      default:
         _loc1_.setEnabledAll(false);
         return;
   }
};
Class_Battlefield_Interaction.prototype.setEnabledAll = function(bool)
{
   var _loc1_ = this;
   _loc1_.bEnable = bool;
   if(bool)
   {
      Class_Cell.prototype.onRelease = _loc1_.onReleaseFct;
      Class_Cell.prototype.onRollOver = _loc1_.onRollOverFct;
      Class_Cell.prototype.onRollOut = _loc1_.onRollOutFct;
   }
   else
   {
      delete Class_Cell.prototype.onRelease;
      delete Class_Cell.prototype.onRollOver;
      delete Class_Cell.prototype.onRollOut;
   }
};
Class_Battlefield_Interaction.prototype.setEnabledOverOut = function(bool)
{
   if(bool)
   {
      Class_Cell.prototype.onRollOver = this.onRollOverFct;
      Class_Cell.prototype.onRollOut = this.onRollOutFct;
   }
   else
   {
      delete Class_Cell.prototype.onRollOver;
      delete Class_Cell.prototype.onRollOut;
   }
};
Class_Battlefield_Interaction.prototype.setEnabledRelease = function(bool)
{
   this.bEnable = bool;
   if(bool)
   {
      Class_Cell.prototype.onRelease = this.onReleaseFct;
   }
   else
   {
      delete Class_Cell.prototype.onRelease;
   }
};
Class_Battlefield_Interaction.prototype.isEnable = function()
{
   return this.bEnable;
};
Class_Battlefield_Interaction.prototype.setType = function(type)
{
   this.type = this.allTypes[type];
};
Class_Battlefield_Interaction.prototype.getType = function()
{
   return this.type;
};
Class_Battlefield_Interaction.prototype.Round = function(cellnum, ray, layerID)
{
   var width = ray;
   var mapWidth = this.map.getWidth();
   var cellData = this.map.getData(cellNum);
   var _loc3_ = - ray;
   var _loc1_;
   var _loc2_;
   while(_loc3_ <= ray)
   {
      var tmpNum = cellnum + mapWidth * _loc3_;
      var cellx = _loc3_;
      var lim = ray - Math.abs(_loc3_);
      _loc1_ = - lim;
      while(_loc1_ <= lim)
      {
         var num = tmpNum + (mapWidth - 1) * _loc1_;
         var celly = width * _loc1_ / ray;
         _loc2_ = KERNEL.PathFinding.convertCoordToxy(cellx,celly);
         this.addCell(num,cellData.x + _loc2_.x,cellData.y + _loc2_.y,layerID);
         _loc1_ = _loc1_ + 1;
      }
      _loc3_ = _loc3_ + 1;
   }
};
ASSetPropFlags(Class_Battlefield_Interaction.prototype,null,1,1);
