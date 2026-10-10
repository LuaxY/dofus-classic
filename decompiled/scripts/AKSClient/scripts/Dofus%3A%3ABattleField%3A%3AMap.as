Class_BattleField_Map = function()
{
   var data;
   this.init();
};
Class_BattleField_Map.prototype = new MovieClip();
Object.registerClass("Dofus::BattleField::Map",Class_BattleField_Map);
Class_BattleField_Map.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.container = BATTLEFIELD.Container;
   _loc1_.Objects = BATTLEFIELD.Objects;
   _loc1_.data.ArrayTacleTeam0 = new Object();
   _loc1_.data.ArrayTacleTeam1 = new Object();
   _loc1_.cell_width = 53;
   _loc1_.cell_height = 27;
};
Class_BattleField_Map.prototype.setVisible = function(bool)
{
   this.container._visible = bool;
};
Class_BattleField_Map.prototype.getWidth = function()
{
   return this.data.width;
};
Class_BattleField_Map.prototype.getHeight = function()
{
   return this.data.height;
};
Class_BattleField_Map.prototype.getData = function(cellNum)
{
   return this.data.data[Number(cellNum)];
};
Class_BattleField_Map.prototype.build = function(mapDataObject)
{
   var _loc2_ = this;
   _loc2_.container.applyMask(mapDataObject.width - 1,mapDataObject.height - 1);
   _loc2_.container.centerMap();
   _loc2_.container.zoomMap();
   _loc2_.data = mapDataObject;
   _loc2_.x = 0;
   _loc2_.y = 0;
   _loc2_.dec = 0;
   _loc2_.width = mapDataObject.width - 1;
   var len = mapDataObject.data.length;
   var c = _loc2_.container;
   var width = _loc2_.width;
   var height = len / width;
   if(mapDataObject.backgroundNum != 0)
   {
      c.Ground.attach(mapDataObject.backgroundNum,"background",-1);
   }
   var _loc3_ = 0;
   var _loc1_;
   while(_loc3_ < len)
   {
      _loc1_ = mapDataObject.data[_loc3_];
      if(_loc1_.active)
      {
         var cell_x = _loc2_.x * _loc2_.cell_width + _loc2_.dec;
         var cell_y = _loc2_.y * _loc2_.cell_height / 2 - 20 * (_loc1_.groundLevel - 7);
         _loc1_.x = cell_x;
         _loc1_.y = cell_y;
         if(!DATACENTER.Map.bRolePlay && _loc1_.lineOfSight || DATACENTER.Map.bRolePlay && _loc1_.movement != 0)
         {
            c.Grid.attachMovie("MC_Cell_Grid","cell" + _loc3_,_loc3_);
            var cell = c.Grid["cell" + _loc3_];
            cell._x = cell_x;
            cell._y = cell_y;
            if(_loc1_.groundSlope != 1)
            {
               cell.gotoAndStop(_loc1_.groundSlope);
            }
            BATTLEFIELD.Interaction.addCell(_loc3_,cell_x,cell_y,0,_loc1_.groundSlope);
         }
         if(_loc1_.layerGroundNum != 0)
         {
            var path = c.Ground.attach(_loc1_.layerGroundNum,"cell" + _loc3_,_loc3_);
            path._x = cell_x;
            path._y = cell_y;
            var rot = _loc1_.layerGroundRot;
            if(_loc1_.groundSlope != 1)
            {
               path.clip.gotoAndStop(_loc1_.groundSlope);
            }
            else if(rot != 0)
            {
               var rotation = rot * 90;
               if(rotation % 180)
               {
                  path.clip._yscale = 192.86;
                  path.clip._xscale = 51.85;
               }
               path.clip._rotation = rotation;
            }
            if(_loc1_.layerGroundFlip)
            {
               path.clip._xscale *= -1;
            }
         }
         if(_loc1_.layerObject1Num != 0)
         {
            var path = c.Object1.attach(_loc1_.layerObject1Num,"cell" + _loc3_,_loc3_);
            path._x = cell_x;
            path._y = cell_y;
            var rot = _loc1_.layerObject1Rot;
            if(_loc1_.groundSlope == 1 && rot != 0)
            {
               path.clip._rotation = rot * 90;
               if(path.clip._rotation % 180)
               {
                  path.clip._yscale = 192.86;
                  path.clip._xscale = 51.85;
               }
            }
            if(_loc1_.layerObject1Flip)
            {
               path.clip._xscale *= -1;
            }
         }
         if(_loc1_.layerObject2Num != 0)
         {
            var objectData = new Object();
            objectData.fileNum = _loc1_.layerObject2Num;
            objectData.walkable = true;
            var clipObj = _loc2_.Objects.build(objectData,_loc3_,_loc1_);
            if(_loc1_.layerObject2Interactive)
            {
               clipObj.setInteraction(true);
            }
         }
      }
      if(_loc2_.x == _loc2_.width)
      {
         _loc2_.x = 0;
         _loc2_.y += 1;
         if(_loc2_.dec == 0)
         {
            _loc2_.dec = _loc2_.cell_width / 2;
            _loc2_.width -= 1;
         }
         else
         {
            _loc2_.dec = 0;
            _loc2_.width += 1;
         }
      }
      else
      {
         _loc2_.x = _loc2_.x + 1;
      }
      _loc3_ = _loc3_ + 1;
   }
   _loc2_.onMapLoad();
};
Class_BattleField_Map.prototype.updateCell = function(cellNum)
{
   var _loc1_ = this;
   _loc1_.x = 0;
   _loc1_.y = 0;
   _loc1_.dec = 0;
   _loc1_.width = _loc1_.data.width - 1;
   var i = cellNum;
   while(i > 0)
   {
      if(_loc1_.x == _loc1_.width)
      {
         _loc1_.x = 0;
         _loc1_.y += 1;
         if(_loc1_.dec == 0)
         {
            _loc1_.dec = _loc1_.cell_width / 2;
            _loc1_.width -= 1;
         }
         else
         {
            _loc1_.dec = 0;
            _loc1_.width += 1;
         }
      }
      else
      {
         _loc1_.x = _loc1_.x + 1;
      }
      i--;
   }
   var len = _loc1_.data.data.length;
   var c = _loc1_.container;
   var width = _loc1_.width;
   var height = len / width;
   var _loc3_ = cellNum;
   var _loc2_ = _loc1_.data.data[_loc3_];
   if(_loc2_.active)
   {
      var cell_x = _loc1_.x * _loc1_.cell_width + _loc1_.dec;
      var cell_y = _loc1_.y * _loc1_.cell_height / 2 - 20 * (_loc2_.groundLevel - 7);
      _loc2_.x = cell_x;
      _loc2_.y = cell_y;
      if(!DATACENTER.Map.bRolePlay && _loc2_.lineOfSight || DATACENTER.Map.bRolePlay && _loc2_.movement != 0)
      {
         c.Grid.attachMovie("MC_Cell_Grid","cell" + _loc3_,_loc3_);
         var cell = c.Grid["cell" + _loc3_];
         cell._x = cell_x;
         cell._y = cell_y;
         if(_loc2_.groundSlope != 1)
         {
            cell.gotoAndStop(_loc2_.groundSlope);
         }
         BATTLEFIELD.Interaction.addCell(_loc3_,cell_x,cell_y,0,_loc2_.groundSlope);
      }
      else
      {
         c.Grid["cell" + _loc3_].removeMovieClip();
      }
      if(_loc2_.layerGroundNum != 0)
      {
         var path = c.Ground.attach(_loc2_.layerGroundNum,"cell" + _loc3_,_loc3_);
         path._x = cell_x;
         path._y = cell_y;
         var rot = _loc2_.layerGroundRot;
         if(_loc2_.groundSlope != 1)
         {
            path.clip.gotoAndStop(_loc2_.groundSlope);
         }
         else if(rot != 0)
         {
            var rotation = rot * 90;
            if(rotation % 180)
            {
               path.clip._yscale = 192.86;
               path.clip._xscale = 51.85;
            }
            path.clip._rotation = rotation;
         }
         if(_loc2_.layerGroundFlip)
         {
            path.clip._xscale *= -1;
         }
      }
      else
      {
         c.Ground.clips["cell" + _loc3_].removeMovieClip();
      }
      if(_loc2_.layerObject1Num != 0)
      {
         var path = c.Object1.attach(_loc2_.layerObject1Num,"cell" + _loc3_,_loc3_);
         path._x = cell_x;
         path._y = cell_y;
         var rot = _loc2_.layerObject1Rot;
         if(_loc2_.groundSlope == 1 && rot != 0)
         {
            path.clip._rotation = rot * 90;
            if(path.clip._rotation % 180)
            {
               path.clip._yscale = 192.86;
               path.clip._xscale = 51.85;
            }
         }
         if(_loc2_.layerObject1Flip)
         {
            path.clip._xscale *= -1;
         }
      }
      else
      {
         c.Object1.clips["cell" + _loc3_].removeMovieClip();
      }
      if(_loc2_.layerObject2Num != 0)
      {
         var objectData = new Object();
         objectData.fileNum = _loc2_.layerObject2Num;
         objectData.walkable = true;
         var clipObj = _loc1_.Objects.build(objectData,_loc3_,_loc2_);
         if(_loc2_.layerObject2Interactive)
         {
            clipObj.setInteraction(true);
         }
      }
      else
      {
         c.Object2.clips["cell" + _loc3_].removeMovieClip();
      }
   }
   else
   {
      c.Grid["cell" + _loc3_].removeMovieClip();
      c.Ground.clips["cell" + _loc3_].removeMovieClip();
      c.Object1.clips["cell" + _loc3_].removeMovieClip();
      c.Object2.clips["cell" + _loc3_].removeMovieClip();
   }
};
Class_BattleField_Map.prototype.getCaseNum = function(x, y)
{
   var _loc1_ = DATACENTER.Map.width;
   return x * _loc1_ + y * (_loc1_ - 1);
};
Class_BattleField_Map.prototype.getCellHeightXY = function(x, y)
{
   var _loc1_ = this.getCaseNum(x,y);
   this.getCellHeight(_loc1_);
};
Class_BattleField_Map.prototype.getCellHeight = function(cellNum)
{
   var _loc1_ = this.getData(cellNum);
   var _loc2_ = !(_loc1_.groundSlope == undefined || _loc1_.groundSlope == 1) ? 0.5 : 0;
   var _loc3_ = _loc1_.groundLevel != undefined ? _loc1_.groundLevel - 7 : 0;
   return _loc3_ + _loc2_ + ph;
};
Class_BattleField_Map.prototype.calculateTacleZone = function()
{
   this.data.TacleZoneTeam0 = new Object();
   this.data.TacleZoneTeam1 = new Object();
   var w = this.getWidth();
   var _loc2_ = [w,w - 1,- (w - 1),- w];
   var characData;
   var _loc3_;
   var team;
   var _loc1_;
   var xInit;
   var xDiff;
   var d2 = this.cell_width / 2;
   for(var k in DATACENTER.Characters.keys)
   {
      characData = DATACENTER.Characters.getItemAt(k);
      team = characData.team;
      _loc3_ = Number(characData.cell);
      xInit = this.getData(_loc3_).x;
      _loc1_ = 0;
      while(_loc1_ < _loc2_.length)
      {
         xDiff = Math.abs(this.getData(_loc3_ + _loc2_[_loc1_]).x - xInit);
         if(xDiff == d2)
         {
            this.data["TacleZoneTeam" + team][_loc3_ + _loc2_[_loc1_]] = true;
         }
         _loc1_ = _loc1_ + 1;
      }
   }
};
Class_BattleField_Map.prototype.calculateRotation = function(cell1, cell2)
{
   var _loc2_ = this.getData(cell1);
   var _loc1_ = this.getData(cell2);
   var _loc3_ = _loc2_.x;
   var yStart = _loc2_.y;
   var xDest = _loc1_.x;
   var yDest = _loc1_.y;
   var rot = Math.atan2(yDest - yStart,xDest - _loc3_);
   return rot;
};
ASSetPropFlags(Class_BattleField_Map.prototype,null,1,1);
