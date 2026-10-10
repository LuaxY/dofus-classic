Class_Battlefield_Pointer = function()
{
   this.cellCoord = [[],[[-26.5,0],[0,-13.5],[26.5,0],[0,13.5]],[[-26.5,-20],[0,-13.5],[26.5,0],[0,13.5]],[[-26.5,0],[0,-33.5],[26.5,0],[0,13.5]],[[-26.5,-20],[0,-33.5],[26.5,0],[0,13.5]],[[-26.5,0],[0,-13.5],[26.5,-20],[0,13.5]],[[-26.5,-20],[0,-13.5],[26.5,-20],[0,13.5]],[[-26.5,0],[0,-33.5],[26.5,-20],[0,13.5]],[[-26.5,-20],[0,-33.5],[26.5,-20],[0,13.5]],[[-26.5,0],[0,-13.5],[26.5,0],[0,-6.5]],[[-26.5,-20],[0,-13.5],[26.5,0],[0,-6.5]],[[-26.5,0],[0,-33.5],[26.5,0],[0,-6.5]],[[-26.5,-20],[0,-33.5],[26.5,0],[0,-6.5]],[[-26.5,0],[0,-13.5],[26.5,-20],[0,-6.5]],[[-26.5,-20],[0,-13.5],[26.5,-20],[0,-6.5]],[[-26.5,0],[0,-33.5],[26.5,-20],[0,-6.5]]];
   this.init();
};
Class_Battlefield_Pointer.prototype = new MovieClip();
Object.registerClass("Dofus::BattleField::Pointer",Class_Battlefield_Pointer);
Class_Battlefield_Pointer.prototype.init = function()
{
   var _loc1_ = this;
   if(_loc1_.container == undefined)
   {
      _loc1_.container = BATTLEFIELD.Container.Pointer;
   }
   _loc1_.map = BATTLEFIELD.Map;
};
Class_Battlefield_Pointer.prototype.setVisible = function(bool)
{
   this.container.dragZone._visible = bool;
   this.unselectAllCharacters(false);
};
Class_Battlefield_Pointer.prototype.clearAll = function()
{
   var _loc1_ = this;
   _loc1_.clearDrag();
   _loc1_.clearFixed();
   _loc1_.shapes = new Array();
   _loc1_.setVisible(true);
   _loc1_.unselectAllCharacters(true);
};
Class_Battlefield_Pointer.prototype.clearDrag = function()
{
   this.container.createEmptyMovieClip("dragZone",2);
};
Class_Battlefield_Pointer.prototype.clearFixed = function()
{
   this.container.createEmptyMovieClip("fixedZone",1);
};
Class_Battlefield_Pointer.prototype.draw = function(cellNum)
{
   var _loc3_ = this;
   _loc3_.clearDrag();
   var _loc2_ = _loc3_.shapes;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.length)
   {
      switch(_loc2_[_loc1_].shape)
      {
         case "P":
            _loc3_.drawCircle(false,0,_loc2_[_loc1_].col,cellNum);
            break;
         case "C":
            _loc3_.drawCircle(false,_loc2_[_loc1_].size,_loc2_[_loc1_].col,cellNum);
            break;
         case "L":
            _loc3_.drawLine(false,_loc2_[_loc1_].size,_loc2_[_loc1_].col,cellNum,DATACENTER.Player.clip.getCellNum());
            break;
         case "X":
            _loc3_.drawCross(false,_loc2_[_loc1_].size,_loc2_[_loc1_].col,cellNum);
      }
      _loc1_ = _loc1_ + 1;
   }
};
Class_Battlefield_Pointer.prototype.addShape = function(shape, size, col)
{
   this.shapes.push({shape:shape,size:size,col:col});
};
Class_Battlefield_Pointer.prototype.drawFixedCircle = function(ray, col, centerCellNum)
{
   this.drawCircle(true,ray,col,centerCellNum);
};
Class_Battlefield_Pointer.prototype.drawFixedCross = function(ray, col, centerCellNum)
{
   this.drawCross(true,ray,col,centerCellNum);
};
Class_Battlefield_Pointer.prototype.drawFixedRect = function(col)
{
   z = this.container.fixedZone;
   z.beginFill(col,50);
   z.moveTo(0,0);
   z.lineTo(742,0);
   z.lineTo(742,432);
   z.lineTo(0,432);
   z.endFill();
};
Class_Battlefield_Pointer.prototype.movePointerTo = function(zone, cellNum)
{
   var _loc1_ = this.map.getData(cellNum);
   zone._x = _loc1_.x;
   zone._y = _loc1_.y + 20 * (_loc1_.groundLevel - 7);
};
Class_Battlefield_Pointer.prototype.drawCircle = function(bFixed, ray, col, centerCellNum)
{
   var _loc2_ = this.cellCoord;
   var mw = this.map.getWidth();
   var cellNum = centerCellNum - ray * mw;
   var _loc3_;
   var j;
   var _loc1_;
   var z;
   var xStart = (- ray) * 26.5;
   var yStart = (- ray) * 13.5;
   if(bFixed)
   {
      z = this.container.fixedZone;
   }
   else
   {
      z = this.container.dragZone;
   }
   z.beginFill(col,50);
   z.lineStyle(1,col,100);
   _loc1_ = this.getGroundData(cellNum);
   z.moveTo(xStart + _loc2_[_loc1_.gf][0][0],yStart + _loc2_[_loc1_.gf][0][1] - _loc1_.gl * 20);
   _loc3_ = 0;
   while(_loc3_ < ray + 1)
   {
      if(_loc3_ != 0)
      {
         cellNum++;
      }
      _loc1_ = this.getGroundData(cellNum);
      z.lineTo(xStart + _loc2_[_loc1_.gf][1][0] + _loc3_ * 53,yStart + _loc2_[_loc1_.gf][1][1] - _loc1_.gl * 20);
      z.lineTo(xStart + _loc2_[_loc1_.gf][2][0] + _loc3_ * 53,yStart + _loc2_[_loc1_.gf][2][1] - _loc1_.gl * 20);
      _loc3_ = _loc3_ + 1;
   }
   _loc3_ -= 1;
   j = 0;
   while(j < ray)
   {
      cellNum += mw * 2 - 1;
      _loc1_ = this.getGroundData(cellNum);
      z.lineTo(xStart + _loc2_[_loc1_.gf][1][0] + _loc3_ * 53,yStart + _loc2_[_loc1_.gf][1][1] + (j + 1) * 27 - _loc1_.gl * 20);
      z.lineTo(xStart + _loc2_[_loc1_.gf][2][0] + _loc3_ * 53,yStart + _loc2_[_loc1_.gf][2][1] + (j + 1) * 27 - _loc1_.gl * 20);
      j++;
   }
   _loc3_ = ray;
   while(_loc3_ >= 0)
   {
      if(_loc3_ != ray)
      {
         cellNum--;
      }
      _loc1_ = this.getGroundData(cellNum);
      z.lineTo(xStart + _loc2_[_loc1_.gf][3][0] + _loc3_ * 53,yStart + _loc2_[_loc1_.gf][3][1] + j * 27 - _loc1_.gl * 20);
      z.lineTo(xStart + _loc2_[_loc1_.gf][0][0] + _loc3_ * 53,yStart + _loc2_[_loc1_.gf][0][1] + j * 27 - _loc1_.gl * 20);
      _loc3_ = _loc3_ - 1;
   }
   _loc3_ += 1;
   j = ray - 1;
   while(j >= 0)
   {
      cellNum -= mw * 2 - 1;
      _loc1_ = this.getGroundData(cellNum);
      z.lineTo(xStart + _loc2_[_loc1_.gf][3][0] + _loc3_ * 53,yStart + _loc2_[_loc1_.gf][3][1] + j * 27 - _loc1_.gl * 20);
      z.lineTo(xStart + _loc2_[_loc1_.gf][0][0] + _loc3_ * 53,yStart + _loc2_[_loc1_.gf][0][1] + j * 27 - _loc1_.gl * 20);
      j--;
   }
   z.endFill();
   this.movePointerTo(z,centerCellNum);
   this.selectCharactersIn(z,centerCellNum,bFixed);
};
Class_Battlefield_Pointer.prototype.drawCross = function(bFixed, ray, col, centerCellNum)
{
   var _loc3_ = this.cellCoord;
   var mw = this.map.getWidth();
   var cellNum = centerCellNum;
   var _loc1_;
   var _loc2_;
   var z;
   if(bFixed)
   {
      z = this.container.fixedZone;
   }
   else
   {
      z = this.container.dragZone;
   }
   z.beginFill(col,50);
   z.lineStyle(1,col,100);
   _loc2_ = this.getGroundData(cellNum);
   z.moveTo(_loc3_[_loc2_.gf][0][0],_loc3_[_loc2_.gf][0][1] - _loc2_.gl * 20);
   _loc1_ = 1;
   while(_loc1_ <= ray)
   {
      cellNum -= mw;
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][0][0] - _loc1_ * 26.5,_loc3_[_loc2_.gf][0][1] - _loc2_.gl * 20 - _loc1_ * 13.5);
      _loc1_ = _loc1_ + 1;
   }
   _loc1_ = ray;
   while(_loc1_ >= 0)
   {
      if(_loc1_ != ray)
      {
         cellNum += mw;
      }
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][1][0] - _loc1_ * 26.5,_loc3_[_loc2_.gf][1][1] - _loc2_.gl * 20 - _loc1_ * 13.5);
      _loc1_ = _loc1_ - 1;
   }
   _loc1_ = 1;
   while(_loc1_ <= ray)
   {
      cellNum -= mw - 1;
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][1][0] + _loc1_ * 26.5,_loc3_[_loc2_.gf][1][1] - _loc2_.gl * 20 - _loc1_ * 13.5);
      _loc1_ = _loc1_ + 1;
   }
   _loc1_ = ray;
   while(_loc1_ >= 0)
   {
      if(_loc1_ != ray)
      {
         cellNum += mw - 1;
      }
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][2][0] + _loc1_ * 26.5,_loc3_[_loc2_.gf][2][1] - _loc2_.gl * 20 - _loc1_ * 13.5);
      _loc1_ = _loc1_ - 1;
   }
   _loc1_ = 1;
   while(_loc1_ <= ray)
   {
      cellNum += mw;
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][2][0] + _loc1_ * 26.5,_loc3_[_loc2_.gf][2][1] - _loc2_.gl * 20 + _loc1_ * 13.5);
      _loc1_ = _loc1_ + 1;
   }
   _loc1_ = ray;
   while(_loc1_ >= 0)
   {
      if(_loc1_ != ray)
      {
         cellNum -= mw;
      }
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][3][0] + _loc1_ * 26.5,_loc3_[_loc2_.gf][3][1] - _loc2_.gl * 20 + _loc1_ * 13.5);
      _loc1_ = _loc1_ - 1;
   }
   _loc1_ = 1;
   while(_loc1_ <= ray)
   {
      cellNum += mw - 1;
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][3][0] - _loc1_ * 26.5,_loc3_[_loc2_.gf][3][1] - _loc2_.gl * 20 + _loc1_ * 13.5);
      _loc1_ = _loc1_ + 1;
   }
   _loc1_ = ray;
   while(_loc1_ > 0)
   {
      if(_loc1_ != ray)
      {
         cellNum -= mw - 1;
      }
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][0][0] - _loc1_ * 26.5,_loc3_[_loc2_.gf][0][1] - _loc2_.gl * 20 + _loc1_ * 13.5);
      _loc1_ = _loc1_ - 1;
   }
   z.endFill();
   this.movePointerTo(z,centerCellNum);
   this.selectCharactersIn(z,centerCellNum,bFixed);
};
Class_Battlefield_Pointer.prototype.drawLine = function(bFixed, length, col, extremCellNum, refCellNum)
{
   var _loc3_ = this.cellCoord;
   var mw = this.map.getWidth();
   var cellNum = extremCellNum;
   var _loc1_;
   var j;
   var _loc2_;
   var z;
   var ray = [0,0,0,0];
   if(refCellNum != extremCellNum)
   {
      var dir = KERNEL.PathFinding.getDirection(refCellNum,extremCellNum);
      ray[dir] = length;
   }
   if(bFixed)
   {
      z = this.container.fixedZone;
   }
   else
   {
      z = this.container.dragZone;
   }
   z.beginFill(col,50);
   z.lineStyle(1,col,100);
   _loc2_ = this.getGroundData(cellNum);
   z.moveTo(_loc3_[_loc2_.gf][0][0],_loc3_[_loc2_.gf][0][1] - _loc2_.gl * 20);
   _loc1_ = 1;
   while(_loc1_ <= ray[0])
   {
      cellNum -= mw;
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][0][0] - _loc1_ * 26.5,_loc3_[_loc2_.gf][0][1] - _loc2_.gl * 20 - _loc1_ * 13.5);
      _loc1_ = _loc1_ + 1;
   }
   _loc1_ = ray[0];
   while(_loc1_ >= 0)
   {
      if(_loc1_ != ray[0])
      {
         cellNum += mw;
      }
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][1][0] - _loc1_ * 26.5,_loc3_[_loc2_.gf][1][1] - _loc2_.gl * 20 - _loc1_ * 13.5);
      _loc1_ = _loc1_ - 1;
   }
   _loc1_ = 1;
   while(_loc1_ <= ray[1])
   {
      cellNum -= mw - 1;
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][1][0] + _loc1_ * 26.5,_loc3_[_loc2_.gf][1][1] - _loc2_.gl * 20 - _loc1_ * 13.5);
      _loc1_ = _loc1_ + 1;
   }
   _loc1_ = ray[1];
   while(_loc1_ >= 0)
   {
      if(_loc1_ != ray[1])
      {
         cellNum += mw - 1;
      }
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][2][0] + _loc1_ * 26.5,_loc3_[_loc2_.gf][2][1] - _loc2_.gl * 20 - _loc1_ * 13.5);
      _loc1_ = _loc1_ - 1;
   }
   _loc1_ = 1;
   while(_loc1_ <= ray[2])
   {
      cellNum += mw;
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][2][0] + _loc1_ * 26.5,_loc3_[_loc2_.gf][2][1] - _loc2_.gl * 20 + _loc1_ * 13.5);
      _loc1_ = _loc1_ + 1;
   }
   _loc1_ = ray[2];
   while(_loc1_ >= 0)
   {
      if(_loc1_ != ray[2])
      {
         cellNum -= mw;
      }
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][3][0] + _loc1_ * 26.5,_loc3_[_loc2_.gf][3][1] - _loc2_.gl * 20 + _loc1_ * 13.5);
      _loc1_ = _loc1_ - 1;
   }
   _loc1_ = 1;
   while(_loc1_ <= ray[3])
   {
      cellNum += mw - 1;
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][3][0] - _loc1_ * 26.5,_loc3_[_loc2_.gf][3][1] - _loc2_.gl * 20 + _loc1_ * 13.5);
      _loc1_ = _loc1_ + 1;
   }
   _loc1_ = ray[3];
   while(_loc1_ > 0)
   {
      if(_loc1_ != ray[3])
      {
         cellNum -= mw - 1;
      }
      _loc2_ = this.getGroundData(cellNum);
      z.lineTo(_loc3_[_loc2_.gf][0][0] - _loc1_ * 26.5,_loc3_[_loc2_.gf][0][1] - _loc2_.gl * 20 + _loc1_ * 13.5);
      _loc1_ = _loc1_ - 1;
   }
   z.endFill();
   this.movePointerTo(z,extremCellNum);
   this.selectCharactersIn(z,extremCellNum,bFixed);
};
Class_Battlefield_Pointer.prototype.getGroundData = function(cellNum)
{
   var _loc1_ = this.map.getData(cellNum);
   var gf = _loc1_.groundSlope != undefined ? _loc1_.groundSlope : 1;
   var gl = _loc1_.groundLevel != undefined ? _loc1_.groundLevel - 7 : 0;
   return {gf:gf,gl:gl};
};
Class_Battlefield_Pointer.prototype.selectCharactersIn = function(zone, cell1, bFixed)
{
   var _loc2_ = bFixed;
   var localPlayerID = DATACENTER.Player.ID;
   var bLaunchOnLocalPLayer = DATACENTER.Player.currentSpell.m_bOnItSelf;
   var _loc3_;
   var _loc1_;
   for(var k in DATACENTER.Characters.keys)
   {
      if(!(k == localPlayerID && !bLaunchOnLocalPLayer))
      {
         _loc1_ = DATACENTER.Characters.getItemAt(k).clip;
         if(_loc1_ != undefined)
         {
            _loc3_ = _loc1_.getCellNum();
            _loc1_.select(true,false,_loc2_);
            if(zone.hitTest(_loc1_.sprite._x,_loc1_.sprite._y,true))
            {
               if(!_loc2_)
               {
                  _loc1_.select(true,true,_loc2_);
               }
               else if(KERNEL.PathFinding.checkView(cell1,_loc3_))
               {
                  _loc1_.select(true,true,_loc2_);
               }
            }
         }
      }
   }
};
Class_Battlefield_Pointer.prototype.unselectAllCharacters = function(bFixed)
{
   var _loc3_ = bFixed;
   var _loc1_;
   for(var _loc2_ in DATACENTER.Characters.keys)
   {
      _loc1_ = DATACENTER.Characters.getItemAt(_loc2_).clip;
      if(_loc1_ != undefined)
      {
         _loc1_.select(DATACENTER.Game.isFight,false,_loc3_);
      }
   }
};
ASSetPropFlags(Class_Battlefield_Pointer.prototype,null,1,1);
