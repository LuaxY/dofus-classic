Class_BattleField_Objects_Object = function()
{
};
Class_BattleField_Objects_Object.prototype = new MovieClip();
Object.registerClass("Dofus::BattleField::Objects::Object",Class_BattleField_Objects_Object);
Class_BattleField_Objects_Object.prototype.init = function(objectData, cellNum, cellData)
{
   this.container = BATTLEFIELD.Container;
   this.map = BATTLEFIELD.Map;
   objectData.cellNum = cellNum;
   this.data = objectData;
   this.sprite = this.container.Object2.clips.createEmptyMovieClip("cell" + cellNum,cellNum * 100);
   with(this.sprite)
   {
      attachMovie(objectData.fileNum,"clip",10);
      _x = cellData.x;
      _y = cellData.y;
      if(cellData.layerObject2Flip)
      {
         _xscale *= -1;
      }
   }
};
Class_BattleField_Objects_Object.prototype.chgCell = function(cellNum)
{
   this.data.cellNum = cellNum;
   this.sprite.swapDepths(cellNum * 100);
};
Class_BattleField_Objects_Object.prototype.setInteraction = function(bool)
{
   var _loc1_ = this;
   if(bool)
   {
      _loc1_.sprite.obj = _loc1_;
      _loc1_.sprite.onRelease = function()
      {
         if(Class_Cell.prototype.onRelease)
         {
            BATTLEFIELD.Interaction.onCellRelease(this.obj.data.cellNum);
         }
      };
      _loc1_.sprite.onRollOut = _loc1_.sprite.onReleaseOutside = function()
      {
         if(Class_Cell.prototype.onRelease)
         {
            BATTLEFIELD.Interaction.onCellRollOut(this.obj.data.cellNum);
            this.obj.select(false);
         }
      };
      _loc1_.sprite.onRollOver = function()
      {
         if(Class_Cell.prototype.onRelease)
         {
            BATTLEFIELD.Interaction.onCellRollOver(this.obj.data.cellNum);
            this.obj.select(true);
         }
      };
   }
   else
   {
      delete _loc1_.sprite.onRelease;
      delete _loc1_.sprite.onReleaseOutside;
      delete _loc1_.sprite.onRollOver;
      delete _loc1_.sprite.onRollOut;
   }
};
Class_BattleField_Objects_Object.prototype.setAnim = function(anim)
{
   this.data.anim = anim;
   this.sprite.clip.gotoAndStop(anim);
};
Class_BattleField_Objects_Object.prototype.getAnim = function()
{
   return this.data.anim;
};
Class_BattleField_Objects_Object.prototype.setVisible = function(bool)
{
   this.sprite._visible = bool;
};
Class_BattleField_Objects_Object.prototype.select = function(bool)
{
   var _loc2_ = this;
   var _loc3_;
   var _loc1_;
   if(arguments.length == 0)
   {
      if(_loc2_.sprite.selection)
      {
         _loc2_.select(false);
      }
      else
      {
         _loc2_.select(true);
      }
   }
   else if(bool)
   {
      _loc3_ = new Color(_loc2_.sprite);
      _loc1_ = new Object();
      _loc1_.ra = 30;
      _loc1_.rb = 180;
      _loc1_.ga = 30;
      _loc1_.gb = 180;
      _loc1_.ba = 30;
      _loc1_.bb = 180;
      _loc3_.setTransform(_loc1_);
   }
   else
   {
      _loc3_ = new Color(_loc2_.sprite);
      _loc1_ = new Object();
      _loc1_.ra = 100;
      _loc1_.rb = 0;
      _loc1_.ga = 100;
      _loc1_.gb = 0;
      _loc1_.ba = 100;
      _loc1_.bb = 0;
      _loc3_.setTransform(_loc1_);
   }
};
Class_BattleField_Objects_Object.prototype.clear = function()
{
   var _loc1_ = this;
   _loc1_.map.data.data[_loc1_.data.cellNum].layerObject = undefined;
   _loc1_.map.data.data[_loc1_.data.cellNum].layerObjectNum = undefined;
   _loc1_.sprite.removeMovieClip();
   _loc1_.removeMovieClip();
};
Class_BattleField_Objects_Object.prototype.stopAnim = function()
{
   this.sprite.stopAllClip();
};
Class_BattleField_Objects_Object.prototype.playAnim = function()
{
   this.sprite.playAllClip();
};
ASSetPropFlags(Class_BattleField_Objects_Object.prototype,null,1,1);
