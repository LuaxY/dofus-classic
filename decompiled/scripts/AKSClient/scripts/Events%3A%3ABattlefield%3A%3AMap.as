BATTLEFIELD.Map.onMapLoad = function()
{
   BATTLEFIELD.Container._visible = true;
   log("affichage :" + (getTimer() - DOFUS.t));
   log("Total :" + (getTimer() - DOFUS.t1));
   var _loc3_;
   if(DATACENTER.Game.isMultiplayer)
   {
      INTERFACE.Text.setText(getText("WAITING_OTHER",[]),false,true);
      AKS.Game.onEverybodyIsReady = function()
      {
         var _loc3_ = DATACENTER.Characters.getItemAt(DATACENTER.Player.ID);
         _loc3_.cell = 500;
         if(_loc3_ != undefined)
         {
            var charac = BATTLEFIELD.Characters.build(_loc3_);
            charac.sprite.startDrag(true);
         }
         var _loc1_;
         var _loc2_ = 0;
         while(_loc2_ < DATACENTER.Game.allowedCells[0].length)
         {
            _loc1_ = DATACENTER.Game.allowedCells[0][_loc2_];
            BATTLEFIELD.Selection.select(_loc1_,true,0,TEAMS_COLOR[0],"");
            if(_loc3_.team == 0)
            {
               BATTLEFIELD.Interaction.addCellNum(_loc1_,1);
            }
            _loc2_ = _loc2_ + 1;
         }
         _loc2_ = 0;
         while(_loc2_ < DATACENTER.Game.allowedCells[1].length)
         {
            _loc1_ = DATACENTER.Game.allowedCells[1][_loc2_];
            BATTLEFIELD.Selection.select(_loc1_,true,0,TEAMS_COLOR[1],"");
            if(_loc3_.team == 1)
            {
               BATTLEFIELD.Interaction.addCellNum(_loc1_,1);
            }
            _loc2_ = _loc2_ + 1;
         }
         BATTLEFIELD.Interaction.setLayerVisible(false,0);
         BATTLEFIELD.Interaction.setLayerVisible(true,1);
         INTERFACE.Text.clearText();
         DATACENTER.Player.clip.setInteraction(false);
         BATTLEFIELD.Interaction.setType("place");
         BATTLEFIELD.Interaction.setEnabled(1);
         INTERFACE.Text.setTextTimer(getText("PLACE_CHARACTER",[]),4000,false,true);
         BATTLEFIELD.Container.show("Grid");
      };
      AKS.Game.ready();
   }
   else
   {
      INTERFACE.Text.setTextTimer("",10);
      BATTLEFIELD.Interaction.setEnabled(1);
      _loc3_ = DATACENTER.Characters.getItemAt(DATACENTER.Player.ID);
      if(_loc3_ != undefined)
      {
         BATTLEFIELD.Characters.build(_loc3_);
      }
      BATTLEFIELD.Interaction.setType("move");
   }
};
