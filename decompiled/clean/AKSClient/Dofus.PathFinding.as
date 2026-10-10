Class_PathFinding = function(string)
{
   var _loc1_ = this;
   _loc1_.STATE_MOVE_SINGLE = 0;
   _loc1_.STATE_SELECT = 1;
   _loc1_.STATE_MOVE = 2;
};
Object.registerClass("Dofus::PathFinding",Class_PathFinding);
Class_PathFinding.prototype.setInitState = function(bFight)
{
   var _loc1_ = this;
   if(bFight)
   {
      _loc1_.State = _loc1_.STATE_SELECT;
      DATACENTER.Player.lastClickedCell = null;
   }
   else
   {
      _loc1_.State = _loc1_.STATE_MOVE_SINGLE;
   }
};
Class_PathFinding.prototype.calculatePath = function(character, cell, bRelease)
{
   var _loc1_ = this;
   var _loc2_ = cell;
   var _loc3_ = BATTLEFIELD.Map.getData(_loc2_);
   var bPlayerOn = _loc3_.PlayerOnID != undefined ? true : false;
   if(bPlayerOn)
   {
      return false;
   }
   if(_loc3_.movement == 0)
   {
      return false;
   }
   switch(_loc1_.State)
   {
      case _loc1_.STATE_MOVE_SINGLE:
         _loc1_.pathFind(character.getCellNum(),_loc2_,false);
         if(DATACENTER.Player.tmpPath != null)
         {
            return true;
         }
         character.say(getText("I_CANT_GO"),"center");
         return false;
         break;
      case _loc1_.STATE_SELECT:
         _loc1_.pathFind(character.getCellNum(),_loc2_,true);
         if(bRelease)
         {
            DATACENTER.Player.lastClickedCell = _loc2_;
            _loc1_.drawPathSelection(CELL_PATH_SELECT_COLOR);
            return true;
         }
         _loc1_.drawPathSelection(CELL_PATH_OVER_COLOR);
         break;
      case _loc1_.STATE_MOVE:
         _loc1_.State = _loc1_.STATE_SELECT;
         if(DATACENTER.Player.lastClickedCell == _loc2_)
         {
            return true;
         }
         BATTLEFIELD.Selection.unSelectAll();
   }
   return false;
};
Class_PathFinding.prototype.drawPathSelection = function(col)
{
   var _loc2_ = DATACENTER.Player.tmpFullPath;
   var _loc3_ = _loc2_.length;
   BATTLEFIELD.Selection.unSelectAll();
   var _loc1_ = 0;
   while(_loc1_ < _loc3_)
   {
      BATTLEFIELD.Selection.select(_loc2_[_loc1_].num,true,8,col);
      _loc1_ = _loc1_ + 1;
   }
};
Class_PathFinding.prototype.goalDistEstimate = function(begin, end)
{
   var data = DATACENTER.Map.data;
   p1 = this.getCaseCoordonnee(begin);
   p2 = this.getCaseCoordonnee(end);
   distx = Math.abs(p1.x - p2.x);
   disty = Math.abs(p1.y - p2.y);
   dist = distx + disty;
   return dist;
};
Class_PathFinding.prototype.getCaseCoordonnee = function(num)
{
   var _loc1_ = DATACENTER.Map.width;
   var _loc3_ = Math.floor(num / (_loc1_ * 2 - 1));
   var _Column = num - _loc3_ * (_loc1_ * 2 - 1);
   var column = _Column % _loc1_;
   var _loc2_ = new Object();
   _loc2_.y = _loc3_ - column;
   _loc2_.x = (num - (_loc1_ - 1) * _loc2_.y) / _loc1_;
   return _loc2_;
};
Class_PathFinding.prototype.getCaseNum = function(x, y)
{
   var _loc1_ = DATACENTER.Map.width;
   return x * _loc1_ + y * (_loc1_ - 1);
};
Class_PathFinding.prototype.convertCoordToxy = function(coordX, coordY)
{
   var _loc1_ = new Object();
   _loc1_.x = (- (- coordX + coordY)) * (BATTLEFIELD.Map.cell_width / 2);
   _loc1_.y = (coordX + coordY) * (BATTLEFIELD.Map.cell_height / 2);
   return _loc1_;
};
Class_PathFinding.prototype.pathFind = function(cellBegin, cellEnd, bFull)
{
   var adverseTeam = DATACENTER.Player.data.team != 0 ? 0 : 1;
   var maxLength = !DATACENTER.Game.isFight ? 500 : DATACENTER.Player.data.AP;
   var _loc3_ = new Object();
   var closeList = new Object();
   _loc3_["cell" + cellBegin] = new Object();
   first = _loc3_["cell" + cellBegin];
   first.num = cellBegin;
   first.g = 0;
   first.v = 0;
   first.h = this.goalDistEstimate(cellBegin,cellEnd);
   first.f = first.h;
   first.parent = null;
   var width = DATACENTER.Map.width;
   var height = DATACENTER.Map.height;
   var depl = [width,width - 1,- (width - 1),- width];
   var pathLength = 0;
   var openListVide = false;
   var _loc1_;
   var _loc2_;
   while(true)
   {
      if(openListVide)
      {
         if(bFull)
         {
            DATACENTER.Player.tmpFullPath = null;
         }
         DATACENTER.Player.tmpPath = null;
         break;
      }
      var index = null;
      var min = 5000;
      for(var a in _loc3_)
      {
         if(_loc3_[a].f < min)
         {
            min = _loc3_[a].f;
            index = a;
         }
      }
      _loc1_ = _loc3_[index];
      delete _loc3_[index];
      if(_loc1_.num == cellEnd)
      {
         DATACENTER.Player.tmpPath = new Array();
         DATACENTER.Player.tmpFullPath = new Array();
         var tmpDir;
         var dir;
         var change = false;
         while(_loc1_.num != cellBegin)
         {
            tmpDir = this.getDirection(_loc1_.num,_loc1_.parent.num);
            if(tmpDir != dir)
            {
               change = true;
               dir = tmpDir;
            }
            if(bFull)
            {
               DATACENTER.Player.tmpFullPath.splice(0,0,{num:_loc1_.num,dir:tmpDir});
               if(DATACENTER.Player.tmpFullPath.length > maxLength)
               {
                  DATACENTER.Player.tmpPath = null;
                  DATACENTER.Player.tmpFullPath = null;
                  break;
               }
            }
            if(change)
            {
               DATACENTER.Player.tmpPath.splice(0,0,{num:_loc1_.num,dir:tmpDir});
               change = false;
            }
            _loc1_ = _loc1_.parent;
         }
         break;
      }
      var len = depl.length;
      var bOnthelast = false;
      var j = 0;
      while(j < len)
      {
         var nextCell = _loc1_.num + depl[j];
         if(Math.abs(DATACENTER.Map.data[nextCell].x - DATACENTER.Map.data[_loc1_.num].x) < 27)
         {
            var cell = DATACENTER.Map.data[nextCell];
            var tz = DATACENTER.Map["TacleZoneTeam" + adverseTeam][nextCell];
            if(nextCell == cellEnd && (cell.movement == 1 || tz))
            {
               bOnthelast = true;
            }
            var bNotPlayerOn = !BATTLEFIELD.Map.bRolePlay ? (cell.playerOnID == undefined ? true : false) : true;
            var bNotInTacleZone = DATACENTER.Game.isFight ? (!(tz && !bOnthelast) ? true : false) : true;
            if(cell.active && (cell.movement > 1 || bOnthelast) && bNotPlayerOn && bNotInTacleZone)
            {
               _loc2_ = "cell" + nextCell;
               var newv = _loc1_.v + 1 + (5 - cell.movement) / 5;
               var newg = _loc1_.g + 1;
               var oldv = null;
               if(_loc3_[_loc2_])
               {
                  oldv = _loc3_[_loc2_].v;
               }
               else if(closeList[_loc2_])
               {
                  oldv = closeList[_loc2_].v;
               }
               if((oldv == null || oldv > newv) && newg <= maxLength)
               {
                  if(closeList[_loc2_])
                  {
                     delete closeList[_loc2_];
                  }
                  if(!_loc3_[_loc2_])
                  {
                     _loc3_[_loc2_] = new Object();
                  }
                  var cell = _loc3_[_loc2_];
                  cell.num = nextCell;
                  cell.g = newg;
                  cell.v = newv;
                  cell.h = this.goalDistEstimate(nextCell,cellEnd);
                  cell.f = cell.v + cell.h;
                  cell.parent = _loc1_;
               }
            }
         }
         j++;
      }
      closeList["cell" + _loc1_.num] = new Object();
      var cell = closeList["cell" + _loc1_.num];
      for(var a in _loc1_)
      {
         cell[a] = _loc1_[a];
      }
      openListVide = true;
      for(var a in _loc3_)
      {
         openListVide = false;
         break;
      }
   }
};
Class_PathFinding.prototype.getDirection = function(cell1, cell2)
{
   p1 = this.getCaseCoordonnee(cell1);
   p2 = this.getCaseCoordonnee(cell2);
   var _loc1_ = -1;
   var _loc2_ = p1.x - p2.x;
   var _loc3_ = p1.y - p2.y;
   if(_loc2_ == 0)
   {
      if(_loc3_ > 0)
      {
         _loc1_ = 1;
      }
      else
      {
         _loc1_ = 3;
      }
   }
   else if(_loc2_ > 0)
   {
      _loc1_ = 0;
   }
   else
   {
      _loc1_ = 2;
   }
   return _loc1_;
};
Class_PathFinding.prototype.getAbsoluteDirection = function(cell1, cell2, width)
{
   p1 = this.getCaseCoordonnee(cell1);
   p2 = this.getCaseCoordonnee(cell2);
   var _loc1_ = -1;
   var _loc3_ = p1.x - p2.x;
   var _loc2_ = p1.y - p2.y;
   if(_loc3_ == 0)
   {
      if(_loc2_ > 0)
      {
         _loc1_ = 1;
      }
      else
      {
         _loc1_ = 3;
      }
   }
   else if(_loc2_ == 0)
   {
      if(_loc3_ > 0)
      {
         _loc1_ = 0;
      }
      else
      {
         _loc1_ = 2;
      }
   }
   return _loc1_;
};
Class_PathFinding.prototype.checkAlign = function(cell1, cell2)
{
   var _loc2_ = this.getCaseCoordonnee(cell1);
   var _loc1_ = this.getCaseCoordonnee(cell2);
   if(_loc2_.x == _loc1_.x)
   {
      return true;
   }
   if(_loc2_.y == _loc1_.y)
   {
      return true;
   }
   return false;
};
Class_PathFinding.prototype.checkRange = function(cell1, cell2, bLineOnly, range, bModerate)
{
   var _loc2_ = bModerate;
   if(_loc2_ == undefined)
   {
      _loc2_ = true;
   }
   var localPlayerCell = DATACENTER.Player.data.cell;
   var _loc3_ = DATACENTER.Player.currentSpell.m_bOnItSelf;
   if(localPlayerCell == cell2 && !_loc3_)
   {
      return false;
   }
   var _loc1_;
   if(_loc2_)
   {
      var rangeModerator = DATACENTER.Player.data.EffectsManager.getModeratorValue(19);
      _loc1_ = Number(range) + Number(rangeModerator);
      if(_loc1_ < 1)
      {
         _loc1_ = 1;
      }
   }
   else
   {
      _loc1_ = Number(range);
   }
   if(bLineOnly)
   {
      if(!this.checkAlign(cell1,cell2))
      {
         return false;
      }
   }
   if(this.goalDistEstimate(cell1,cell2) > _loc1_)
   {
      return false;
   }
   return true;
};
Class_PathFinding.prototype.checkView = function(cell1, cell2)
{
   var p1 = this.getCaseCoordonnee(cell1);
   var p2 = this.getCaseCoordonnee(cell2);
   var cd1 = BATTLEFIELD.Map.getData(cell1);
   var cd2 = BATTLEFIELD.Map.getData(cell2);
   var ph1 = !cd1.playerOnID ? 0 : PLAYER_HEIGHT[DATACENTER.Characters.getItemAt(cd1.playerOnID).guild];
   var ph2 = !cd2.playerOnID ? 0 : PLAYER_HEIGHT[DATACENTER.Characters.getItemAt(cd2.playerOnID).guild];
   p1.z = BATTLEFIELD.Map.getCellHeight(cell1) + ph1;
   p2.z = BATTLEFIELD.Map.getCellHeight(cell2) + ph2;
   var zDiff = p2.z - p1.z;
   var d = Math.max(Math.abs(p1.y - p2.y),Math.abs(p1.x - p2.x));
   var a = Math.getSlope(p1.x,p1.y,p2.x,p2.y);
   var b = p1.y - a * p1.x;
   var dx = p2.x - p1.x >= 0 ? 1 : -1;
   var _loc2_ = p2.y - p1.y >= 0 ? 1 : -1;
   var lastY = p1.y;
   var lastX = p1.x;
   var x2dx = p2.x * dx;
   var y2dy = p2.y * _loc2_;
   var destY;
   var scanY;
   var destX;
   var scanX;
   var y;
   var _loc1_;
   var _loc3_;
   var moveX;
   _loc3_ = p1.x + 0.5 * dx;
   loop0:
   while(_loc3_ * dx <= x2dx)
   {
      y = a * _loc3_ + b;
      if(_loc2_ > 0)
      {
         destY = Math.round(y);
         scanY = Math.ceil(y - 0.5);
      }
      else
      {
         destY = Math.ceil(y - 0.5);
         scanY = Math.round(y);
      }
      _loc1_ = lastY;
      while(true)
      {
         if(_loc1_ * _loc2_ <= scanY * _loc2_)
         {
            if(!this.checkCellView(_loc3_ - dx / 2,_loc1_,false,p1,p2,zDiff,d))
            {
               break;
            }
            _loc1_ += _loc2_;
            continue;
         }
         lastY = destY;
         _loc3_ += dx;
         continue loop0;
      }
      return false;
   }
   _loc1_ = lastY;
   while(_loc1_ * _loc2_ <= p2.y * _loc2_)
   {
      if(!this.checkCellView(_loc3_ - 0.5 * dx,_loc1_,false,p1,p2,zDiff,d))
      {
         return false;
      }
      _loc1_ += _loc2_;
   }
   if(!this.checkCellView(_loc3_ - 0.5 * dx,_loc1_ - _loc2_,true,p1,p2,zDiff,d))
   {
      return false;
   }
   return true;
};
Class_PathFinding.prototype.checkCellView = function(x, y, bool, p1, p2, zDiff, d)
{
   var _loc1_ = this.getCaseNum(x,y);
   var _loc2_ = BATTLEFIELD.Map.getData(_loc1_);
   var _loc3_ = Math.max(Math.abs(p1.y - y),Math.abs(p1.x - x));
   var eh = _loc3_ / d * zDiff + p1.z;
   var h = BATTLEFIELD.Map.getCellHeight(_loc1_);
   var bPlayerOn = !(_loc2_.PlayerOnID == undefined || _loc3_ == 0 || bool || p2.x == x && p2.y == y) ? true : false;
   if(_loc2_.lineOfSight && h <= eh && !bPlayerOn)
   {
      return true;
   }
   if(bool)
   {
      return true;
   }
   return false;
};
