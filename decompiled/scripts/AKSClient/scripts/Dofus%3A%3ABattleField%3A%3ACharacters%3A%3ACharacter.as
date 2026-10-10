Class_BattleField_Characters_Character = function()
{
   this.intervalID = 0;
};
Class_BattleField_Characters_Character.prototype = new MovieClip();
Object.registerClass("Dofus::BattleField::Characters::Character",Class_BattleField_Characters_Character);
Class_BattleField_Characters_Character.prototype.init = function(characterData)
{
   var _loc1_ = this;
   _loc1_.container = BATTLEFIELD.Container;
   _loc1_.map = BATTLEFIELD.Map;
   _loc1_.data = characterData;
   _loc1_.PointLevelV = 0;
   _loc1_.PointLevelA = 0;
   _loc1_.container.Object2.clips.createEmptyMovieClip("sprite" + _loc1_.data.index,Number(_loc1_.data.index) + 200000);
   _loc1_.sprite = _loc1_.container.Object2.clips["sprite" + _loc1_.data.index];
   _loc1_.sprite.__proto__ = MovieClip.prototype;
   _loc1_.sprite.createEmptyMovieClip("clip",2);
   _loc1_.sprite._ACTION = _loc1_;
   _loc1_.sprite._OBJECT = _loc1_;
   _loc1_.onInitFrame = function()
   {
      var _loc1_ = this;
      _loc1_.setPosition(_loc1_.data.cell,_loc1_.data.dir);
      _loc1_.wait();
   };
   _loc1_.sprite.clip.loadMovie(_loc1_.data.file);
   CCOLORS.addCharacter(_loc1_.sprite.clip);
   CCOLORS.setColor(_loc1_.sprite.clip._target,_loc1_.data.color1,_loc1_.data.color2,_loc1_.data.color3);
   WEAPONS.addCharacter(_loc1_.sprite.clip);
   WEAPONS.setData(_loc1_.sprite.clip._target,_loc1_.data);
   _loc1_.data.SEQUENCER_action.clear();
   _loc1_.data.SEQUENCER_anim.clear();
};
Class_BattleField_Characters_Character.prototype.clear = function()
{
   var _loc1_ = this;
   delete _loc1_.map.data.data[_loc1_.data.cell].playerOnID;
   _loc1_.sprite.removeMovieClip();
   clearInterval(_loc1_.intervalID);
   _loc1_.endSmile();
};
Class_BattleField_Characters_Character.prototype.showName = function(bool)
{
   var _loc1_ = this;
   var _loc3_;
   var _loc2_;
   if(bool)
   {
      _loc3_ = !DATACENTER.GAME.isFight ? _loc1_.data.name : _loc1_.data.name + " (" + _loc1_.data.LP + ")";
      _loc2_ = _loc1_.sprite._y >= 70 ? _loc1_.sprite._y - 65 : _loc1_.sprite._y + 30;
      INTERFACE.drawToolTip(_loc3_,Math.ceil(_loc1_.sprite._x) * (BATTLEFIELD.Container._xscale / 100) + BATTLEFIELD.Container._x,Math.ceil(_loc2_) * (BATTLEFIELD.Container._xscale / 100) + BATTLEFIELD.Container._y,false,true,0);
   }
   else
   {
      INTERFACE.hideToolTip();
   }
};
Class_BattleField_Characters_Character.prototype.showPoints = function(VorA, Points)
{
   var _loc1_ = this;
   var _loc2_ = VorA;
   if(Points == 0)
   {
      delete points;
   }
   var pl = _loc1_["PointLevel" + _loc2_]++;
   var depth = 1;
   if(_loc2_ == "life")
   {
      depth = 100;
   }
   _loc1_.sprite.createEmptyMovieClip("point" + _loc2_ + pl,(3 + pl) * depth);
   var _loc3_ = _loc1_.sprite["point" + _loc2_ + pl];
   _loc3_._y = - _loc1_.sprite.clip._height;
   _loc3_.previous = _loc1_.sprite["point" + _loc2_ + (pl - 1)];
   _loc3_.VorA = _loc2_;
   if(Points)
   {
      var col;
      var x;
      switch(_loc2_)
      {
         case "life":
            col = LIFE_POINT_COLOR;
            if(Points < 0)
            {
               _loc1_.setAnim("hit");
               if(_loc1_.data.num == DATACENTER.Player.ID)
               {
                  INTERFACE.InterfaceBanner.setPlayerHeadAnim("hit");
               }
            }
            x = -25;
            break;
         case "action":
            col = ACTION_POINT_COLOR;
            x = 0;
      }
      _loc3_.createTextField(_loc2_,1,x,0,40,30);
      _loc3_[_loc2_].setText(Points,"Font2",col,18);
      _loc3_._alpha = 150;
      _loc3_.onEnterFrame = function()
      {
         var _loc1_ = this;
         var _loc2_ = _loc1_._alpha;
         if(_loc1_.previous._alpha < 50 || (_loc1_.previous == undefined || _loc1_.debug > 20))
         {
            _loc1_._alpha -= 5;
            if(_loc1_._alpha <= 0)
            {
               _loc1_._parent._ACTION["PointLevel" + _loc1_.VorA]--;
               _loc1_.removeMovieClip();
            }
            _loc1_._y -= 2;
         }
         if(_loc1_._alpha == _loc2_)
         {
            _loc1_.debug = _loc1_.debug + 1;
         }
      };
   }
};
Class_BattleField_Characters_Character.prototype.showActionPoints = function(AP)
{
   var _loc1_ = this;
   var _loc3_ = AP;
   if(_loc3_ == 0)
   {
      false;
   }
   _loc1_.PointLevel = _loc1_.PointLevel + 1;
   _loc1_.sprite.createEmptyMovieClip("point" + _loc1_.PointLevel,3 + _loc1_.PointLevel);
   var _loc2_ = _loc1_.sprite["point" + _loc1_.PointLevel];
   _loc2_._y = - _loc1_.sprite.clip._height;
   _loc2_.previous = _loc1_.sprite["point" + (_loc1_.PointLevel - 1)];
   if(_loc3_)
   {
      _loc2_.createTextField("action",2,0,0,40,30);
      _loc2_.action.setText(_loc3_,"Font2",ACTION_POINT_COLOR,18);
      _loc2_.onEnterFrame = function()
      {
         var _loc1_ = this;
         if(_loc1_.previous._alpha < 50)
         {
            _loc1_._alpha -= 5;
            if(_loc1_._alpha <= 0)
            {
               _loc1_._parent._ACTION.PointLevel--;
               _loc1_.removeMovieClip();
            }
            _loc1_._y -= 2;
         }
      };
   }
};
Class_BattleField_Characters_Character.prototype.setVisible = function(bool)
{
   this.sprite._visible = bool;
};
Class_BattleField_Characters_Character.prototype.select = function(bool, bAnim, bAnimForced)
{
   var _loc2_ = this;
   if(bAnim == undefined)
   {
      bAnim = false;
   }
   if(bForced == undefined)
   {
      bForced = true;
   }
   var _loc1_ = _loc2_.sprite;
   if(bAnimForced)
   {
      _loc2_.bSelectAnimForced = bAnim;
   }
   bAnim = _loc2_.bSelectAnimForced || bAnim;
   if(bool)
   {
      if(_loc1_.circle)
      {
         _loc1_.circle.animate(bAnim);
      }
      else
      {
         _loc1_.createEmptyMovieClip("circle",1);
         _loc1_.circle.onInitFrame = function()
         {
            var _loc1_ = this;
            _loc1_.animate(bAnim);
            _loc1_.setColor(TEAMS_COLOR[_loc1_._parent._ACTION.data.team]);
         };
         _loc1_.circle.loadMovie(CLIPS_PATH + "circle.swf");
      }
   }
   else
   {
      _loc1_.circle.removeMovieClip();
   }
};
Class_BattleField_Characters_Character.prototype.isSelect = function()
{
   if(this.sprite.circle)
   {
      return true;
   }
   return false;
};
Class_BattleField_Characters_Character.prototype.stopMove = function()
{
   var _loc1_ = this;
   _loc1_.data.SEQUENCER_actions.clear();
   _loc1_.data.SEQUENCER_anim.clearAllNextActions();
   _loc1_.data.SEQUENCER_anim.addAction(false,_loc1_,_loc1_.wait,[]);
};
Class_BattleField_Characters_Character.prototype.setInteraction = function(bool)
{
   var _loc1_ = this;
   if(bool)
   {
      _loc1_.sprite.obj = _loc1_;
      _loc1_.sprite.onRelease = function()
      {
         if(Class_Cell.prototype.onRelease)
         {
            BATTLEFIELD.Interaction.onCellRelease(this.obj.data.cell);
         }
      };
      _loc1_.sprite.onRollOut = _loc1_.sprite.onReleaseOutside = function()
      {
         var _loc3_ = this;
         _loc3_.obj.showName(false);
         var _loc2_ = new Color(_loc3_.clip);
         var _loc1_ = new Object();
         _loc1_.ra = 100;
         _loc1_.rb = 0;
         _loc1_.ga = 100;
         _loc1_.gb = 0;
         _loc1_.ba = 100;
         _loc1_.bb = 0;
         _loc2_.setTransform(_loc1_);
         if(Class_Cell.prototype.onRelease)
         {
            BATTLEFIELD.Interaction.onCellRollOut(_loc3_.obj.data.cell);
         }
      };
      _loc1_.sprite.onRollOver = function()
      {
         var _loc3_ = this;
         _loc3_.obj.showName(true);
         var _loc2_ = new Color(_loc3_.clip);
         var _loc1_ = new Object();
         _loc1_.ra = 60;
         _loc1_.rb = 100;
         _loc1_.ga = 60;
         _loc1_.gb = 100;
         _loc1_.ba = 60;
         _loc1_.bb = 100;
         _loc2_.setTransform(_loc1_);
         if(Class_Cell.prototype.onRelease)
         {
            BATTLEFIELD.Interaction.onCellRollOver(_loc3_.obj.data.cell);
         }
      };
   }
   else
   {
      delete _loc1_.sprite.onPress;
      delete _loc1_.sprite.onRelease;
      delete _loc1_.sprite.onReleaseOutside;
      delete _loc1_.sprite.onRollOver;
      delete _loc1_.sprite.onRollOut;
   }
};
Class_BattleField_Characters_Character.prototype.setPosition = function(cell, dir, bSetDir)
{
   var _loc1_ = this;
   if(dir == undefined)
   {
      dir = _loc1_.data.dir;
   }
   if(bSetDir == undefined)
   {
      bSetDir = true;
   }
   _loc1_.setNewCell(cell,true);
   if(bSetDir)
   {
      _loc1_.setDir(dir);
   }
   var _loc2_ = _loc1_.map.getData(cell);
   var _loc3_ = !(_loc2_.groundSlope == undefined || _loc2_.groundSlope == 1) ? -10 : 0;
   _loc1_.sprite._x = _loc2_.x;
   _loc1_.sprite._y = _loc2_.y + _loc3_;
   _loc1_.chgDepth(_loc1_.data.cell * 100 + 50);
};
Class_BattleField_Characters_Character.prototype.setNewCell = function(cell, bCalculateTacle)
{
   var _loc1_ = this;
   delete _loc1_.map.data.data[_loc1_.data.cell].playerOnID;
   _loc1_.map.data.data[cell].playerOnID = _loc1_.data.num;
   _loc1_.data.cell = Number(cell);
   if(bCalculateTacle)
   {
      _loc1_.map.calculateTacleZone();
   }
};
Class_BattleField_Characters_Character.prototype.getDir = function()
{
   return this.data.dir;
};
Class_BattleField_Characters_Character.prototype.setDir = function(dir)
{
   var _loc1_ = this;
   _loc1_.data.dir = dir;
   _loc1_.setAnim(_loc1_.data.anim);
};
Class_BattleField_Characters_Character.prototype.smiley = function(smileID)
{
   var _loc1_ = this;
   _loc1_.smiley_mc = _loc1_.attachMovie("SmileyOverHead","smiley" + _loc1_.data.index + "_mc",_loc1_.container.text.maxDepth);
   _loc1_.smiley_mc.drawSmiley(smileID);
   _loc1_.placeSmiley();
};
Class_BattleField_Characters_Character.prototype.placeSmiley = function()
{
   var _loc2_ = this;
   var _loc3_ = _loc2_.sprite.getBounds(_loc2_.sprite._parent);
   var _loc1_ = _loc2_.smiley_mc;
   _loc1_._x = Math.ceil(_loc2_.sprite._x) * (BATTLEFIELD.Container._xscale / 100) + BATTLEFIELD.Container._x;
   if(Math.ceil(_loc2_.sprite._y) * (BATTLEFIELD.Container._yscale / 100) + BATTLEFIELD.Container._y > 80)
   {
      _loc1_._y = _loc3_.yMin * (BATTLEFIELD.Container._yscale / 100) + BATTLEFIELD.Container._y - 20;
   }
   else
   {
      _loc1_._y = _loc3_.yMax * (BATTLEFIELD.Container._yscale / 100) + BATTLEFIELD.Container._y + 20;
   }
};
Class_BattleField_Characters_Character.prototype.endSmiley = function()
{
   this.smiley_mc.remove();
};
Class_BattleField_Characters_Character.prototype.say = function(txt, textAlign)
{
   var _loc1_ = this;
   var _loc2_ = textAlign;
   if(!_loc1_.container.text["text" + _loc1_.data.index])
   {
      if(!_loc1_.container.text.maxDepth)
      {
         _loc1_.container.text.maxDepth = _loc1_.data.index;
      }
      else
      {
         _loc1_.container.text.maxDepth += 1;
      }
      if(!_loc2_)
      {
         _loc2_ = "left";
      }
      _loc1_.bubble = _loc1_.container.text.attachMovie("DialogBubbleSymbol","text" + _loc1_.data.index,_loc1_.container.text.maxDepth,{align:_loc2_});
   }
   _loc1_.bubble.setText(txt);
   _loc1_.placeBubble();
};
Class_BattleField_Characters_Character.prototype.endSay = function()
{
   this.container.text["text" + this.data.index].remove();
};
Class_BattleField_Characters_Character.prototype.placeBubble = function()
{
   var _loc3_ = this;
   var _loc2_ = _loc3_.sprite.getBounds(_loc3_.sprite._parent);
   var _loc1_ = _loc3_.bubble;
   if(_loc3_.sprite._x < 375)
   {
      _loc1_.flipRight();
      _loc1_._x = _loc2_.xMax;
   }
   else
   {
      _loc1_.flipLeft();
      _loc1_._x = _loc2_.xMin;
   }
   if(_loc3_.sprite._y > 225)
   {
      _loc1_.flipTop();
      _loc1_._y = _loc2_.yMin;
   }
   else
   {
      _loc1_.flipBottom();
      _loc1_._y = _loc2_.yMin + 20;
   }
};
Class_BattleField_Characters_Character.prototype.moveCharacterThroughPath = function(path, bSel)
{
   var _loc2_ = path;
   var len = _loc2_.length;
   var characData = this.data;
   var _loc3_ = characData.SEQUENCER_anim;
   var SEQUENCER_actions = characData.SEQUENCER_actions;
   _loc3_.referer = this;
   var _loc1_;
   if(_loc2_ != null)
   {
      BATTLEFIELD.Selection.unSelectAll();
      _loc3_.clear();
      var stopWalk = false;
      var bRun = len <= 15 ? false : true;
      _loc3_.addAction(false,this,this.setPosition,[_loc2_[0],KERNEL.PathFinding.getDirection(_loc2_[0],_loc2_[1])]);
      if(!bSel)
      {
      }
      _loc1_ = 1;
      while(_loc1_ < len)
      {
         if(_loc1_ == len - 1)
         {
            stopWalk = true;
         }
         _loc3_.addAction(true,this,this.move,[_loc2_[_loc1_],stopWalk,bRun,false]);
         if(bSel)
         {
            BATTLEFIELD.Selection.select(_loc2_[_loc1_],true,8,CELL_PATH_COLOR);
            _loc3_.addAction(false,BATTLEFIELD.Selection,BATTLEFIELD.Selection.select,[_loc2_[_loc1_],true,9,CELL_PATH_USED_COLOR]);
         }
         _loc1_ = _loc1_ + 1;
      }
      if(bSel)
      {
         _loc3_.addAction(false,BATTLEFIELD.Selection,BATTLEFIELD.Selection.unSelectAll,[]);
      }
      _loc3_.onSequenceEnd = function()
      {
         SEQUENCER_actions.onActionEnd(this.referer[SEQUENCER_actions.unicID]);
         delete this.onSequenceEnd;
      };
      _loc3_.play();
      return true;
   }
   return false;
};
Class_BattleField_Characters_Character.prototype.slide = function(SEQUENCER_actions, cell)
{
   var _loc2_ = this;
   var path = KERNEL.Compressor.makeFullPath([_loc2_.data.cell,cell]);
   var _loc3_ = path.length;
   var characData = _loc2_.data;
   var SEQUENCER_anim = characData.SEQUENCER_anim;
   var bLast = false;
   SEQUENCER_anim.referer = _loc2_;
   var _loc1_;
   if(path != null)
   {
      SEQUENCER_anim.clear();
      SEQUENCER_anim.addAction(false,_loc2_,_loc2_.setPosition,[path[0],KERNEL.PathFinding.getDirection(path[0],path[1])]);
      _loc1_ = 1;
      while(_loc1_ < _loc3_)
      {
         if(_loc1_ == _loc3_ - 1)
         {
            bLast = true;
         }
         SEQUENCER_anim.addAction(true,_loc2_,_loc2_.move,[path[_loc1_],bLast,false,true]);
         _loc1_ = _loc1_ + 1;
      }
      SEQUENCER_anim.onSequenceEnd = function()
      {
         SEQUENCER_actions.onActionEnd(this.referer[SEQUENCER_actions.unicID]);
         delete this.onSequenceEnd;
      };
      SEQUENCER_anim.play();
      return true;
   }
   return false;
};
Class_BattleField_Characters_Character.prototype.move = function(cell, stopMove, bRun, bSlide)
{
   var _loc1_ = this;
   var _loc3_;
   var _loc2_;
   if(cell != _loc1_.data.cell)
   {
      _loc3_ = _loc1_.map.getData(_loc1_.data.cell);
      _loc2_ = _loc1_.map.getData(cell);
      var speed = !bSlide ? _loc3_.movement + (!bRun ? 0 : 3) : 15;
      if(cell > _loc1_.data.cell)
      {
         _loc1_.chgDepth(cell * 100 + 50);
      }
      _loc1_.xDest = _loc2_.x;
      _loc1_.yDest = _loc2_.y;
      _loc1_.speed = speed;
      var variation = 30 * _loc1_.speed / 100;
      if(_loc2_.groundLevel < _loc3_.groundLevel)
      {
         _loc1_.speed += variation;
      }
      else if(_loc2_.groundLevel > _loc3_.groundLevel)
      {
         _loc1_.speed -= variation;
      }
      else if(_loc3_.groundSlope != _loc2_.groundSlope)
      {
         if(_loc2_.groundSlope == 1)
         {
            _loc1_.speed += variation;
         }
         else if(_loc3_.groundSlope == 1)
         {
            _loc1_.speed -= variation;
         }
      }
      if(_loc2_.groundSlope != 1)
      {
         _loc1_.yDest -= 10;
      }
      _loc1_.calculateCharacterDirection(_loc1_.sprite._x,_loc1_.sprite._y,_loc1_.xDest,_loc1_.yDest,bSlide);
      if(bSlide)
      {
         _loc1_.wait();
      }
      else if(bRun)
      {
         _loc1_.setAnim("Run");
      }
      else
      {
         _loc1_.setAnim("Walk");
      }
      var dist = Math.sqrt(Math.pow(_loc1_.sprite._x - _loc1_.xDest,2) + Math.pow(_loc1_.sprite._y - _loc1_.yDest,2));
      _loc1_.setNewCell(cell,stopMove);
      _loc1_.onEnterFrame = function()
      {
         var _loc1_ = this;
         if(dist <= _loc1_.speed)
         {
            if(_loc1_.sprite.getDepth() != cell * 100 + 50)
            {
               _loc1_.chgDepth(cell * 100 + 50);
            }
            _loc1_.sprite._x += dist * Math.cos(_loc1_.rot);
            _loc1_.sprite._y += dist * Math.sin(_loc1_.rot);
            if(stopMove && !bSlide)
            {
               _loc1_.wait();
            }
            delete _loc1_.onEnterFrame;
            _loc1_.sprite.end(_loc1_.data.SEQUENCER_anim);
         }
         else
         {
            _loc1_.sprite._x += _loc1_.speed * Math.cos(_loc1_.rot);
            _loc1_.sprite._y += _loc1_.speed * Math.sin(_loc1_.rot);
            dist -= _loc1_.speed;
         }
         if(_loc1_.container.text["text" + _loc1_.data.index])
         {
            _loc1_.placeBubble();
         }
         if(_loc1_.smiley_mc)
         {
            _loc1_.placeSmiley();
         }
      };
   }
   else
   {
      _loc1_.sprite.end(_loc1_.data.SEQUENCER_anim);
   }
};
Class_BattleField_Characters_Character.prototype.shoot = function(cellNumTo)
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.data.SEQUENCER_anim;
   var SEQUENCER_actions = _loc1_.data.SEQUENCER_actions;
   var _loc3_ = _loc1_.map.getData(cellNumTo);
   var obj = _loc1_;
   _loc1_.calculateCharacterDirection(_loc1_.sprite._x,_loc1_.sprite._y,_loc3_.x,_loc3_.y);
   _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["shoot"]);
   _loc2_.onSequenceEnd = function()
   {
      SEQUENCER_actions.onActionEnd(obj[SEQUENCER_actions.unicID]);
      delete this.onSequenceEnd;
   };
   _loc2_.play();
};
Class_BattleField_Characters_Character.prototype.cast = function(spellType, spellData, params)
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.data.SEQUENCER_anim;
   var SEQUENCER_actions = _loc1_.data.SEQUENCER_actions;
   clearInterval(_loc1_.intervalID);
   _loc2_.clear();
   _loc2_.onSequenceEnd();
   var cellNumFrom = params.cellFrom;
   var _loc3_ = params.cellTo;
   var cellToData = _loc1_.map.getData(_loc3_);
   _loc1_.calculateCharacterDirection(_loc1_.sprite._x,_loc1_.sprite._y,cellToData.x,cellToData.y);
   switch(spellType)
   {
      case 0:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["shoot"]);
         break;
      case 10:
      case 11:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["cast"]);
         var cell = spellType != 10 ? _loc3_ : cellNumFrom;
         _loc2_.addAction(false,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launch,[_loc1_,spellData,cell]);
         break;
      case 12:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["cast"]);
         _loc2_.addAction(true,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchOnCharacter,[_loc1_,spellData]);
         break;
      case 20:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["cast"]);
         _loc2_.addAction(true,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchRotate,[_loc1_,spellData,cellNumFrom,_loc3_]);
         break;
      case 21:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["shoot"]);
         _loc2_.addAction(false,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchRotate,[_loc1_,spellData,cellNumFrom,_loc3_]);
         break;
      case 22:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["cast"]);
         _loc2_.addAction(true,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchRotate,[_loc1_,spellData,cellNumFrom,_loc3_]);
         _loc2_.addAction(false,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchShoot,[_loc1_,spellData,cellNumFrom,_loc3_]);
         break;
      case 23:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["shoot"]);
         _loc2_.addAction(true,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchRotate,[_loc1_,spellData,cellNumFrom,_loc3_]);
         _loc2_.addAction(false,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchShoot,[_loc1_,spellData,cellNumFrom,_loc3_]);
         break;
      case 30:
      case 31:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["cast"]);
         var angle;
         var speed;
         if(spellType == 30)
         {
            angle = 0.5;
            speed = 0.5;
         }
         else
         {
            angle = 0.9;
            speed = 0.4;
         }
         _loc2_.addAction(true,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchToArc,[_loc1_,spellData,cellNumFrom,_loc3_,angle,speed]);
         break;
      case 32:
      case 33:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["shoot"]);
         var angle;
         var speed;
         if(spellType == 32)
         {
            angle = 0.5;
            speed = 0.5;
         }
         else
         {
            angle = 0.9;
            speed = 0.4;
         }
         _loc2_.addAction(true,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchToArc,[_loc1_,spellData,cellNumFrom,_loc3_,angle,speed]);
         break;
      case 40:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["shoot"]);
         _loc2_.addAction(true,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchToDuplicate,[_loc1_,spellData,cellNumFrom,_loc3_]);
         break;
      case 41:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["shoot"]);
         _loc2_.addAction(true,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchToDuplicate,[_loc1_,spellData,cellNumFrom,_loc3_]);
         _loc2_.addAction(false,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchShoot,[_loc1_,spellData,cellNumFrom,_loc3_]);
         break;
      case 50:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["cast"]);
         _loc2_.addAction(true,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchFree,[_loc1_,spellData,cellNumFrom,_loc3_]);
         break;
      case 51:
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["shoot"]);
         _loc2_.addAction(true,BATTLEFIELD.Spells,BATTLEFIELD.Spells.launchFree,[_loc1_,spellData,cellNumFrom,_loc3_]);
         break;
      default:
         trace("ERREUR : Le type de lancé n\'est pas bon.");
         _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["cast"]);
   }
   var obj = _loc1_;
   _loc2_.onSequenceEnd = function()
   {
      SEQUENCER_actions.onActionEnd(obj[SEQUENCER_actions.unicID]);
      delete this.onSequenceEnd;
   };
   if(!_loc2_.isPlaying())
   {
      _loc2_.play();
   }
};
Class_BattleField_Characters_Character.prototype.die = function(SEQUENCER_actions)
{
   var _loc1_ = this;
   INTERFACE.UIInterfaceBanner.removePlayerTimeline(_loc1_.data.num);
   var _loc2_ = _loc1_.data.SEQUENCER_anim;
   var obj = _loc1_;
   _loc2_.clear();
   _loc2_.addAction(true,_loc1_,_loc1_.setAnim,["die"]);
   _loc2_.addAction(false,_loc1_,_loc1_.clear,[]);
   _loc2_.addAction(false,_loc1_,_loc1_.setNewCell,[undefined,true]);
   _loc2_.onSequenceEnd = function()
   {
      SEQUENCER_actions.onActionEnd(obj[SEQUENCER_actions.unicID]);
      delete this.onSequenceEnd;
   };
   if(!_loc2_.isPlaying())
   {
      _loc2_.play();
   }
};
Class_BattleField_Characters_Character.prototype.wait = function()
{
   this.setAnim("static");
   clearInterval(this.intervalID);
};
Class_BattleField_Characters_Character.prototype.setAnim = function(anim)
{
   var _loc2_ = this;
   var _loc3_ = anim;
   var _loc1_ = _loc2_.sprite.clip;
   if(_loc3_ != "static" && _loc3_ != "wait")
   {
      clearInterval(_loc2_.intervalID);
   }
   if(_loc2_.data.dir == 0)
   {
      _loc1_.gotoAndStop(_loc3_ + "R");
      _loc1_._xscale = 100;
   }
   else if(_loc2_.data.dir == 1)
   {
      _loc1_.gotoAndStop(_loc3_ + "R");
      _loc1_._xscale = -100;
   }
   else if(_loc2_.data.dir == 2)
   {
      _loc1_.gotoAndStop(_loc3_ + "L");
      _loc1_._xscale = 100;
   }
   else if(_loc2_.data.dir == 3)
   {
      _loc1_.gotoAndStop(_loc3_ + "L");
      _loc1_._xscale = -100;
   }
   var oldAnim = _loc2_.data.anim.toLowerCase();
   if(oldAnim == "walk" || oldAnim == "run")
   {
      if(_loc3_.toLowerCase() == oldAnim)
      {
         return;
      }
   }
   _loc1_.playFirstChildren();
   _loc2_.data.anim = _loc3_;
};
Class_BattleField_Characters_Character.prototype.getAnim = function()
{
   return this.data.anim;
};
Class_BattleField_Characters_Character.prototype.chgDepth = function(depth)
{
   this.sprite.swapDepths(depth);
};
Class_BattleField_Characters_Character.prototype.getCellNum = function()
{
   return this.data.cell;
};
Class_BattleField_Characters_Character.prototype.stopAnim = function()
{
   this.sprite.stopAllClip();
};
Class_BattleField_Characters_Character.prototype.playAnim = function()
{
   this.sprite.playAllClip();
};
Class_BattleField_Characters_Character.prototype.calculateCharacterDirection = function(x1, y1, x2, y2)
{
   var _loc1_ = this;
   _loc1_.rot = Math.atan2(y2 - y1,x2 - x1);
   if(_loc1_.rot < 0)
   {
      if(Math.abs(_loc1_.rot) > 1.5707963267948966)
      {
         _loc1_.data.dir = 2;
      }
      else
      {
         _loc1_.data.dir = 3;
      }
   }
   else if(_loc1_.rot < 1.5707963267948966)
   {
      _loc1_.data.dir = 0;
   }
   else
   {
      _loc1_.data.dir = 1;
   }
};
ASSetPropFlags(Class_BattleField_Characters_Character.prototype,null,1,1);
