Class_BattleField_Spells = function()
{
   this.init();
};
Class_BattleField_Spells.prototype = new Object();
Object.registerClass("Dofus::BattleField::Spells",Class_BattleField_Spells);
Class_BattleField_Spells.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.container = BATTLEFIELD.Container;
   _loc1_.map = BATTLEFIELD.Map;
   _loc1_.incIndex = 0;
   _loc1_.Garbage = new Array();
};
Class_BattleField_Spells.prototype.clear = function()
{
   var _loc3_ = this;
   var _loc1_;
   var _loc2_;
   _loc1_ = 0;
   while(_loc1_ < _loc3_.Garbage.length)
   {
      _loc2_ = _loc3_.Garbage[_loc1_];
      if(_loc2_ == undefined)
      {
         _loc3_.Garbage.splice(_loc1_,1);
      }
      if(getTimer() - _loc2_._launchTime > SEQUENCER_TIMEOUT * 2)
      {
         _loc2_.removeMovieClip();
         _loc3_.Garbage.splice(_loc1_,1);
      }
      _loc1_ = _loc1_ + 1;
   }
};
Class_BattleField_Spells.prototype.addToGarbageCollector = function(spell_mc)
{
   spell_mc._launchTime = getTimer();
   this.Garbage.push(spell_mc);
};
Class_BattleField_Spells.prototype.getNextIndex = function()
{
   var _loc1_ = this;
   _loc1_.incIndex = _loc1_.incIndex + 1;
   if(_loc1_.incIndex > 20)
   {
      _loc1_.incIndex = 0;
   }
   return _loc1_.incIndex;
};
Class_BattleField_Spells.prototype.launch = function(character, spellData, cellNum)
{
   var _loc2_ = this;
   var d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
   var _loc3_ = _loc2_.getNextIndex();
   var cellData = _loc2_.map.getData(cellNum);
   _loc2_.clear();
   _loc2_.container.Object2.clips.createEmptyMovieClip("spell" + _loc3_,cellNum * 100 + 50 + d + _loc3_);
   var _loc1_ = _loc2_.container.Object2.clips["spell" + _loc3_];
   _loc2_.addToGarbageCollector(_loc1_);
   _loc1_.createEmptyMovieClip("clip",1);
   _loc1_._ACTION = character;
   _loc1_._OBJECT = _loc2_;
   _loc1_._x = cellData.x;
   _loc1_._y = cellData.y;
   _loc1_.clip.loadMovie(spellData.file);
};
Class_BattleField_Spells.prototype.launchFree = function(character, spellData, cellNumFrom, cellNumTo)
{
   var _loc1_ = this;
   var d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
   var map = _loc1_.map;
   var _loc3_ = _loc1_.getNextIndex();
   var cellDataFrom = map.getData(cellNumFrom);
   var cellDataTo = map.getData(cellNumTo);
   _loc1_.container.Object2.clips.createEmptyMovieClip("shoot" + _loc3_,cellNumTo * 100 + 51 + d + _loc3_);
   var _loc2_ = _loc1_.container.Object2.clips["shoot" + _loc3_];
   _loc1_.addToGarbageCollector(_loc2_);
   _loc2_.createEmptyMovieClip("clip",1);
   _loc2_._ACTION = character;
   _loc2_.clip.onInitFrame = function()
   {
      var _loc1_ = this;
      _loc1_.level = Number(spellData.m_Level);
      _loc1_.cellFrom = {x:cellDataFrom.x,y:cellDataFrom.y};
      _loc1_.cellTo = {x:cellDataTo.x,y:cellDataTo.y};
   };
   _loc2_.clip.loadMovie(spellData.file);
};
Class_BattleField_Spells.prototype.launchShoot = function(character, spellData, cellNumFrom, cellNumTo)
{
   var _loc1_ = this;
   var d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
   var map = _loc1_.map;
   var _loc3_ = _loc1_.getNextIndex();
   var cellData = map.getData(cellNumTo);
   _loc1_.container.Object2.clips.createEmptyMovieClip("shoot" + _loc3_,cellNumTo * 100 + 51 + d + _loc3_);
   var _loc2_ = _loc1_.container.Object2.clips["shoot" + _loc3_];
   _loc1_.addToGarbageCollector(_loc2_);
   _loc2_.createEmptyMovieClip("clip",1);
   _loc2_._x = cellData.x;
   _loc2_._y = cellData.y;
   _loc2_.clip.onInitFrame = function()
   {
      var _loc1_ = this;
      _loc1_.level = Number(spellData.m_Level);
      _loc1_.angle = map.calculateRotation(cellNumFrom,cellNumTo);
      _loc1_.rotate.swapDepths(1);
      _loc1_.rotate.removeMovieClip();
      _loc1_.attachMovie("shoot","shoot",10);
   };
   _loc2_.clip.loadMovie(spellData.file);
};
Class_BattleField_Spells.prototype.launchOnCharacter = function(character, spellData)
{
   var _loc2_ = this;
   var d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
   var _loc3_ = _loc2_.getNextIndex();
   var cellData = _loc2_.map.getData(cellNum);
   _loc2_.clear();
   var _loc1_ = character.sprite.createEmptyMovieClip("spell" + _loc3_,100 + _loc3_);
   _loc2_.addToGarbageCollector(_loc1_);
   _loc1_.createEmptyMovieClip("clip",1);
   _loc1_._ACTION = character;
   _loc1_._OBJECT = _loc2_;
   _loc1_.clip.onInitFrame = function()
   {
      this.level = Number(spellData.m_Level);
   };
   _loc1_.clip.loadMovie(spellData.file);
};
Class_BattleField_Spells.prototype.launchToLine = function(character, spellData, cellNumFrom, cellNumTo)
{
   var _loc1_ = this;
   var d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
   var depthIndex = _loc1_.getNextIndex();
   _loc1_.clear();
   _loc1_.container.Object2.clips.createEmptyMovieClip("spell" + depthIndex,cellNumTo * 100 + 50 + d + depthIndex);
   var spell = _loc1_.container.Object2.clips["spell" + depthIndex];
   _loc1_.addToGarbageCollector(spell);
   spell.clip.removeMovieClip();
   spell.createEmptyMovieClip("clip",1);
   spell._ACTION = character;
   spell._OBJECT = _loc1_;
   var _loc2_ = _loc1_.map.getData(cellNumFrom);
   var _loc3_ = _loc1_.map.getData(cellNumTo);
   spell._x = _loc2_.x;
   spell._y = _loc2_.y - 10;
   _loc1_.container.Object2.lineStyle(0,255,100);
   _loc1_.container.Object2.moveTo(_loc2_.x,_loc2_.y - 10);
   _loc1_.container.Object2.curveTo(_loc2_.x + (_loc3_.x - _loc2_.x) / 2,Math.min(_loc2_.y,_loc3_.y) - 60,_loc3_.x,_loc3_.y - 10);
   spell.cellNumFrom = cellNumFrom;
   spell.cellNumTo = cellNumTo;
   spell.clip.loadMovie(spellData.file);
   spell.clip.onInitFrame = function()
   {
      var _loc1_ = this;
      var spell = _loc1_._parent;
      var cellData1 = spell._ACTION.map.getData(spell.cellNumFrom);
      var _loc2_ = spell._ACTION.map.getData(spell.cellNumTo);
      var speed = 40;
      var _loc3_ = cellData1.x;
      var yStart = cellData1.y;
      var xDest = _loc2_.x;
      var yDest = _loc2_.y - 10;
      if(_loc2_.groundFrame != 1)
      {
         _loc1_.yDest -= 10;
      }
      var rot = Math.atan2(yDest - yStart,xDest - _loc3_);
      _loc1_._rotation = rot * 180 / 3.141592653589793;
      var dist = Math.sqrt(Math.pow(_loc3_ - xDest,2) + Math.pow(yStart - yDest,2));
      _loc1_.onEnterFrame = function()
      {
         if(dist <= this.speed)
         {
            spell._x += dist * Math.cos(rot);
            spell._y += dist * Math.sin(rot);
            delete this.onEnterFrame;
         }
         else
         {
            spell._x += speed * Math.cos(rot);
            spell._y += speed * Math.sin(rot);
            dist -= speed;
         }
      };
   };
};
Class_BattleField_Spells.prototype.launchToDuplicate = function(character, spellData, cellNumFrom, cellNumTo)
{
   var _loc1_ = this;
   var d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
   var depthIndex = _loc1_.getNextIndex();
   _loc1_.clear();
   _loc1_.container.Object2.clips.createEmptyMovieClip("spell" + depthIndex,cellNumTo * 100 + 50 + d + depthIndex);
   var spell = _loc1_.container.Object2.clips["spell" + depthIndex];
   _loc1_.addToGarbageCollector(spell);
   spell.clip.removeMovieClip();
   spell.createEmptyMovieClip("clip",1);
   spell._ACTION = character;
   spell._OBJECT = _loc1_;
   var _loc3_;
   var _loc2_;
   if(character.getCellNum() == cellNumTo)
   {
      spell.clip.end();
   }
   else
   {
      _loc3_ = _loc1_.map.getData(cellNumFrom);
      _loc2_ = _loc1_.map.getData(cellNumTo);
      var xStart = _loc3_.x;
      var yStart = _loc3_.y;
      var xDest = _loc2_.x;
      var yDest = _loc2_.y;
      if(_loc3_.groundFrame > 1)
      {
         yStart -= 10;
      }
      if(_loc2_.groundFrame > 1)
      {
         yDest -= 10;
      }
      spell._x = xStart;
      spell._y = yStart;
      spell.clip.onInitFrame = function()
      {
         var _loc1_ = this;
         _loc1_.level = Number(spellData.m_Level);
         var _loc2_ = 20 + _loc1_.level;
         var spell = _loc1_._parent;
         var rot = Math.atan2(yDest - yStart,xDest - xStart);
         var fullDist = Math.sqrt(Math.pow(xStart - xDest,2) + Math.pow(yStart - yDest,2));
         var interval = fullDist / Math.floor(fullDist / _loc2_);
         var dist = 0;
         var inc = 1;
         _loc1_.onEnterFrame = function()
         {
            var _loc1_ = this;
            dist += interval;
            if(dist > fullDist)
            {
               _loc1_.end();
               delete _loc1_.onEnterFrame;
            }
            else
            {
               _loc1_.attachMovie("duplicate","duplicate" + inc,inc);
               _loc1_["duplicate" + inc]._x = dist * Math.cos(rot);
               _loc1_["duplicate" + inc]._y = dist * Math.sin(rot);
               inc++;
            }
         };
      };
      spell.clip.loadMovie(spellData.file);
   }
};
Class_BattleField_Spells.prototype.launchToArc = function(character, spellData, cellNumFrom, cellNumTo, angleCoef, speed)
{
   var _loc1_ = this;
   var startangle = angleCoef;
   var depthIndex = _loc1_.getNextIndex();
   var PI2 = 1.5707963267948966;
   var _loc2_ = _loc1_.map.getData(cellNumFrom);
   var cellToData = _loc1_.map.getData(cellNumTo);
   var _loc3_ = cellToData.x - _loc2_.x;
   var diry = cellToData.y - _loc2_.y;
   var tmpangle = (Math.atan2(diry,Math.abs(_loc3_)) + PI2) * startangle;
   var angle = tmpangle - PI2;
   var xDest = Math.abs(_loc3_);
   var yDest = diry;
   var d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
   _loc1_.clear();
   _loc1_.container.Object2.clips.createEmptyMovieClip("spell" + depthIndex,cellNumFrom * 100 + 50 + d + depthIndex);
   var spell = _loc1_.container.Object2.clips["spell" + depthIndex];
   _loc1_.addToGarbageCollector(spell);
   spell.clip.removeMovieClip();
   spell.createEmptyMovieClip("clip",1);
   spell._ACTION = character;
   spell._OBJECT = _loc1_;
   spell._ROOTANIM = spell.clip;
   spell.clip._x = _loc2_.x;
   spell.clip._y = _loc2_.y - 20;
   if(_loc3_ <= 0)
   {
      if(_loc3_ == 0 && diry < 0)
      {
         spell.clip._yscale = - spell.clip._yscale;
         yDest = - yDest;
      }
      spell.clip._xscale = - spell.clip._xscale;
   }
   spell.angle = angle;
   spell.xDest = xDest;
   spell.yDest = yDest;
   spell.speed = speed;
   spell.depthDest = cellNumTo * 100 + 50 + 20;
   spell.clip.onInitFrame = function()
   {
      var _loc1_ = this;
      _loc1_.level = spellData.m_Level;
      _loc1_.attachMovie("move","move",2);
      var spell = _loc1_._parent;
      var vyi;
      var x;
      var y;
      var g = 9.81;
      var halfg = g / 2;
      var t = 0;
      var vx = Math.sqrt(Math.abs(halfg * Math.pow(spell.xDest,2) / Math.abs(spell.yDest - Math.tan(spell.angle) * spell.xDest)));
      var vy = Math.tan(spell.angle) * vx;
      _loc1_.onEnterFrame = function()
      {
         var _loc1_ = this;
         vyi = vy + g * t;
         x = t * vx;
         y = halfg * Math.pow(t,2) + vy * t;
         t += spell.speed;
         if(Math.abs(y) >= Math.abs(spell.yDest) && x >= spell.xDest || x > spell.xDest)
         {
            spell.swapDepths(spell.depthDest);
            _loc1_.attachMovie("shoot","shoot",2);
            _loc1_.shoot._x = xDest;
            _loc1_.shoot._y = yDest;
            _loc1_.shoot._rotation = Math.atan(vyi / vx) * 180 / 3.141592653589793;
            _loc1_.end();
            delete _loc1_.onEnterFrame;
         }
         else
         {
            _loc1_.move._x = x;
            _loc1_.move._y = y;
            _loc1_.move._rotation = Math.atan(vyi / vx) * 180 / 3.141592653589793;
         }
      };
   };
   spell.clip.loadMovie(spellData.file);
};
Class_BattleField_Spells.prototype.launchRotate = function(character, spellData, cellNumFrom, cellNumTo)
{
   var _loc1_ = this;
   var _loc3_ = _loc1_.map.getData(cellNumFrom);
   var cellData2 = _loc1_.map.getData(cellNumTo);
   var depthIndex = _loc1_.getNextIndex();
   var d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
   _loc1_.clear();
   _loc1_.container.Object2.clips.createEmptyMovieClip("spell" + depthIndex,cellNumFrom * 100 + 50 + d + depthIndex);
   var _loc2_ = _loc1_.container.Object2.clips["spell" + depthIndex];
   _loc1_.addToGarbageCollector(_loc2_);
   _loc2_.clip.removeMovieClip();
   _loc2_.createEmptyMovieClip("clip",1);
   _loc2_._ACTION = character;
   _loc2_._OBJECT = _loc1_;
   _loc2_.clip._x = _loc3_.x;
   _loc2_.clip._y = _loc3_.y;
   var xStart = _loc3_.x;
   var yStart = _loc3_.y;
   var xDest = cellData2.x;
   var yDest = cellData2.y;
   if(cellData2.groundFrame != 1)
   {
      _loc1_.yDest -= 10;
   }
   var rot = Math.atan2(yDest - yStart,xDest - xStart) * 180 / 3.141592653589793;
   _loc2_.clip.onInitFrame = function()
   {
      var _loc1_ = this;
      _loc1_.level = spellData.m_Level;
      _loc1_.angle = rot;
      _loc1_.rotate._rotation = rot;
      _loc1_.rotate.play();
   };
   _loc2_.clip.loadMovie(spellData.file);
};
ASSetPropFlags(Class_BattleField_Spells.prototype,null,1,1);
