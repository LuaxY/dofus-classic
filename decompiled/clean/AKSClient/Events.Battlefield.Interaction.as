BATTLEFIELD.Interaction.onCellRelease = function(cellNum)
{
   var _loc1_ = this;
   var _loc2_ = cellNum;
   var _loc3_;
   switch(_loc1_.type)
   {
      case 1:
         var characData = DATACENTER.Player.data;
         if(KERNEL.PathFinding.calculatePath(characData.clip,_loc2_,true))
         {
            if(getTimer() - _loc1_.lastActionTime < CLICK_MINIMUM_TIMER)
            {
               trace("T trop rapide du clic");
               return;
            }
            _loc1_.lastActionTime = getTimer();
            _loc3_ = KERNEL.Compressor.compressPath(DATACENTER.Player.tmpPath);
            if(_loc3_ != undefined)
            {
               characData.GameActionsManager.transmittingMove(1,[_loc3_]);
               DATACENTER.Player.clearTmpPaths();
               INTERFACE.drawAnimSelection(DATACENTER.Map.data[_loc2_].x * (BATTLEFIELD.Container._xscale / 100) + BATTLEFIELD.Container._x,DATACENTER.Map.data[_loc2_].y * (BATTLEFIELD.Container._yscale / 100) + BATTLEFIELD.Container._y);
            }
         }
         break;
      case 2:
         if(DATACENTER.Player.currentSpell != null && _loc1_.canLaunchSpell == true)
         {
            BATTLEFIELD.Spells.clear();
            var characData = DATACENTER.Player.data;
            characData.GameActionsManager.transmittingOther(300,[DATACENTER.Player.currentSpell.m_ID,_loc2_]);
            DATACENTER.Player.currentSpell = null;
         }
         else if(_loc1_.errorMessage != undefined)
         {
            KERNEL.traceToChat(_loc1_.errorMessage,ERROR_CHAT_COLOR);
            delete BATTLEFIELD.Interaction.errorMessage;
         }
         _loc1_.setType("move");
         break;
      case 3:
         if(DATACENTER.Player.currentSpell != null && _loc1_.canLaunchSpell == true)
         {
            var characData = DATACENTER.Player.data;
            characData.GameActionsManager.transmittingOther(303,[_loc2_]);
            DATACENTER.Player.currentSpell = null;
         }
         _loc1_.setType("move");
         break;
      case 4:
         if(_loc2_ != DATACENTER.Player.data.cell)
         {
            AKS.Game.setPlayerPosition(_loc2_);
         }
         DATACENTER.Player.clip.setInteraction(true);
      default:
         return;
   }
};
BATTLEFIELD.Interaction.onCellRollOver = function(cellNum)
{
   var _loc1_ = this;
   var _loc3_ = cellNum;
   var _loc2_;
   switch(_loc1_.type)
   {
      case 1:
         if(DATACENTER.Game.isFight)
         {
            var characData = DATACENTER.Player.data;
            var characClip = characData.clip;
            if(KERNEL.PathFinding.checkRange(characClip.getCellNum(),_loc3_,false,characData.AP,false))
            {
               KERNEL.PathFinding.setInitState(DATACENTER.Game.isFight);
               KERNEL.PathFinding.calculatePath(characClip,_loc3_,false);
            }
         }
         break;
      case 2:
         delete _loc1_.onMouseUp;
         Mouse.removeListener(_loc1_);
         var cell1 = DATACENTER.Player.clip.getCellNum();
         var cell2 = _loc3_;
         var cell2Data = BATTLEFIELD.Map.getData(_loc3_);
         _loc2_ = DATACENTER.Player.currentSpell;
         var spellsManager = DATACENTER.Player.SpellsManager;
         var characOnID = BATTLEFIELD.Map.getData(_loc3_).PlayerOnID;
         _loc1_.canLaunchSpell = false;
         if(KERNEL.PathFinding.checkRange(cell1,cell2,_loc2_.m_bLineOnly,_loc2_.m_Range))
         {
            if(_loc2_.m_bFreeCell && cell2Data.movement > 1 && cell2Data.PlayerOnID == undefined)
            {
               _loc1_.canLaunchSpell = spellsManager.checkCanLaunchSpell(_loc2_.m_ID,characOnID);
            }
            if(_loc2_.m_bLineOfSight)
            {
               if(KERNEL.PathFinding.checkView(cell1,cell2))
               {
                  _loc1_.canLaunchSpell = spellsManager.checkCanLaunchSpell(_loc2_.m_ID,characOnID);
               }
            }
            else if(!_loc2_.m_bFreeCell)
            {
               _loc1_.canLaunchSpell = spellsManager.checkCanLaunchSpell(_loc2_.m_ID,characOnID);
            }
         }
         if(_loc1_.canLaunchSpell)
         {
            INTERFACE.getCursor().setForbidden(false);
            BATTLEFIELD.Pointer.setVisible(true);
            BATTLEFIELD.Pointer.draw(_loc3_);
         }
         else
         {
            INTERFACE.getCursor().setForbidden(true);
         }
         break;
      case 3:
         delete _loc1_.onMouseUp;
         Mouse.removeListener(_loc1_);
         var cell1 = DATACENTER.Player.clip.getCellNum();
         var cell2 = _loc3_;
         var cell2Data = BATTLEFIELD.Map.getData(_loc3_);
         _loc1_.canLaunchSpell = false;
         if(KERNEL.PathFinding.checkRange(cell1,cell2,false,1))
         {
            if(cell2Data.movement > 1 && cell2Data.PlayerOnID != undefined)
            {
               if(KERNEL.PathFinding.checkView(cell1,cell2))
               {
                  _loc1_.canLaunchSpell = true;
               }
            }
         }
         if(_loc1_.canLaunchSpell)
         {
            INTERFACE.getCursor().setForbidden(false);
            BATTLEFIELD.Pointer.setVisible(true);
            BATTLEFIELD.Pointer.draw(_loc3_);
         }
         else
         {
            INTERFACE.getCursor().setForbidden(true);
         }
      default:
         return;
   }
};
BATTLEFIELD.Interaction.onCellRollOut = function(cellNum)
{
   var _loc1_ = this;
   switch(_loc1_.type)
   {
      case 1:
         if(DATACENTER.Game.isFight)
         {
            BATTLEFIELD.Selection.unSelectAll();
         }
         break;
      case 2:
      case 3:
         _loc1_.onMouseUp = function()
         {
            var _loc1_ = this;
            _loc1_.setType("move");
            Mouse.removeListener(_loc1_);
            delete _loc1_.onMouseUp;
         };
         Mouse.addListener(_loc1_);
         INTERFACE.getCursor().setForbidden(true);
         BATTLEFIELD.Pointer.setVisible(false);
         _loc1_.canLaunchSpell = false;
      default:
         return;
   }
};
