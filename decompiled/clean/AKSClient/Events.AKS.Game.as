AKS.Game.onCreateSolo = function(success)
{
   log("onCreateSolo:" + getTimer());
   INTERFACE.clear();
   KERNEL.drawPlayerInterface();
   KERNEL.PathFinding.setInitState(false);
   DOFUS.onEnterFrame = function()
   {
      AKS.Game.GetMapData();
      delete this.onEnterFrame;
   };
   SOMA.onEnterVillage();
};
AKS.Game.onMapData = function(id, width, height, bRolePlay, backgroundID, data)
{
   log("onMapData" + getTimer());
   var _loc1_ = getMapText(id).n;
   KERNEL.Compressor.uncompressMap(Number(id),_loc1_,width,height,bRolePlay,backgroundID,data);
   KERNEL.drawCurrentMap();
};
AKS.Game.onCellData = function(cellNum, compressData, mask)
{
   KERNEL.Compressor.uncompressCell(cellNum,compressData,mask);
   BATTLEFIELD.MAP.updateCell(cellNum);
};
AKS.Game.onMapsList = function(list)
{
   var _loc3_ = list;
   var lst = AKS.Game.output.comboMaps;
   lst.removeAll();
   var _loc1_ = 0;
   var _loc2_;
   while(_loc1_ < _loc3_.length)
   {
      _loc2_ = _loc3_[_loc1_];
      lst.addItem(getMapText(_loc2_).n,_loc2_);
      _loc1_ = _loc1_ + 1;
   }
   lst.setSelectedIndex(0);
};
AKS.Game.onList = function(gamesArray)
{
   var _loc2_ = gamesArray;
   var _loc3_ = AKS.Game.output.comboGames;
   _loc3_.removeAll();
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.length)
   {
      _loc3_.addItem(_loc2_[_loc1_].name + " (" + _loc2_[_loc1_].playersCount + " / " + _loc2_[_loc1_].maxPlayersCount + ")",_loc2_[_loc1_].name);
      _loc1_ = _loc1_ + 1;
   }
   _loc3_.setSelectedIndex(0);
};
AKS.Game.onCreateMulti = function(success, params)
{
   if(success)
   {
      this.onJoin(success,params,true);
   }
   else
   {
      KERNEL.traceToChat(getText("ERROR_CREATING_GAME",[]) + " : " + getText("ERROR_CREATING_" + params,[]),ERROR_CHAT_COLOR);
   }
};
AKS.Game.onJoin = function(success, params, bCreator)
{
   var _loc2_ = params;
   var _loc3_;
   var _loc1_;
   if(success)
   {
      DATACENTER.Game.bYouAreCreator = bCreator;
      AKS.Game.output._parent.showLayer("TabGameJoined");
      if(!bCreator)
      {
         AKS.Game.output.btnPlay._visible = false;
      }
      else
      {
         AKS.Game.output.btnPlay._visible = true;
      }
      AKS.Game.output.txtGameName.setText(DATACENTER.Game.m_name);
      _loc3_ = _loc2_[1].charCodeAt(0) - 64 + " " + getText("VERSUS",[]) + " " + (_loc2_[1].charCodeAt(1) - 64);
      AKS.Game.output.txtGameMap.setText(getMapText(_loc2_[0]).n);
      AKS.Game.output.txtGameOptions.setText(_loc3_);
      AKS.Game.output.MapImage.loadMapImage(_loc2_[0]);
      AKS.Game.output.txtPasswordValue.setText(AKS.Game.tmpPassword);
      _loc1_ = 0;
      while(_loc1_ < DATACENTER.Game.m_maxPlayerCount)
      {
         AKS.Game.output.players.attachMovie("TabGameJoined_PlayerEmpty","player" + _loc1_,_loc1_ + 10);
         joueur = AKS.Game.output.players["player" + _loc1_];
         joueur._y = 16 * _loc1_;
         _loc1_ = _loc1_ + 1;
      }
      AKS.Chat.output.clearForNewChat();
   }
   else
   {
      KERNEL.traceToChat(getText("ERROR_JOINING_GAME",[]) + " : " + getText("ERROR_JOINING_" + _loc2_,[]),ERROR_CHAT_COLOR);
   }
};
AKS.Game.onJoinRandom = function(bCreator)
{
   DATACENTER.Game.bYouAreCreator = bCreator;
   if(bCreator)
   {
      AKS.Game.output.teamMateChoose._visible = true;
   }
   AKS.Chat.output.clearForNewChat();
   AKS.Game.output._parent.showLayer("TabPlayDofus",true,true);
};
AKS.Game.onMovement = function(badd, characData)
{
   var _loc2_ = this;
   var _loc3_ = badd;
   var _loc1_;
   if(DATACENTER.Game.isMultiplayer)
   {
      if(_loc3_)
      {
         DATACENTER.Game.m_playerCount++;
      }
      else
      {
         DATACENTER.Game.m_playerCount--;
      }
      if(_loc3_)
      {
         DATACENTER.Game.players.setItemAt(characData.num,characData);
      }
      else
      {
         DATACENTER.Game.players.deleteItemAt(characData.num);
      }
      if(DATACENTER.Game.isRunning)
      {
         if(!_loc3_)
         {
            KERNEL.traceToChat(getText("LEAVE_GAME",[characData.name]),INFO_CHAT_COLOR);
            if(!DATACENTER.Game.bInSearch)
            {
               characData.clip.die(characData.SEQUENCER_actions);
            }
         }
      }
      else
      {
         _loc1_ = characData.joinPosition;
         var joueur;
         if(_loc3_)
         {
            if(DATACENTER.Game.isRandom)
            {
               if(!DATACENTER.Game.bInSearch)
               {
                  AKS.Game.output.onValidateInvitation(characData.num);
               }
            }
            else
            {
               AKS.Game.output.players["player" + _loc1_].removeMovieClip();
               AKS.Game.output.players.attachMovie("TabGameJoined_Player","player" + _loc1_,_loc1_ + 10,{bCreator:DATACENTER.Game.bYouAreCreator,playerID:characData.num});
               joueur = AKS.Game.output.players["player" + _loc1_];
               joueur._y = 16 * _loc1_;
               joueur.onEnterFrame = function()
               {
                  var _loc1_ = this;
                  if(characData.num == DATACENTER.Player.ID)
                  {
                     _loc1_.radioTeam0.onClick = function()
                     {
                        if(!this.bSelected)
                        {
                           AKS.Game.changeTeam(0);
                        }
                     };
                     _loc1_.radioTeam0.setEnabled(true);
                     _loc1_.radioTeam1.onClick = function()
                     {
                        if(!this.bSelected)
                        {
                           AKS.Game.changeTeam(1);
                        }
                     };
                     _loc1_.radioTeam1.setEnabled(true);
                  }
                  joueur.setPlayerName(characData.name);
                  joueur.setPlayerGuild(characData.guildName);
                  joueur.setPlayerLevel(characData.level);
                  joueur.setPlayerTeam(characData.team);
                  delete _loc1_.onEnterFrame;
               };
            }
            if(characData.num != 0 && !DATACENTER.Game.bInSearch)
            {
               AKS.Chat.output.addUser(characData);
            }
         }
         else
         {
            if(DATACENTER.Game.isRandom)
            {
               AKS.Game.output.onRemoveCharacter(characData.num);
            }
            else
            {
               AKS.Game.output.players.attachMovie("TabGameJoined_PlayerEmpty","player" + _loc1_,_loc1_ + 10);
               joueur = AKS.Game.output.players["player" + _loc1_];
               joueur._y = 16 * _loc1_;
            }
            if(characData.num != 0)
            {
               AKS.Chat.output.removeUser(characData.name);
            }
         }
      }
   }
   else if(_loc3_)
   {
      var clip = BATTLEFIELD.Characters.build(characData);
      clip.setPosition(characData.cell,characData.dir);
   }
   else
   {
      characData.clip.clear();
   }
};
AKS.Game.onLeave = function()
{
   this.onActionsFinish(DATACENTER.Player.ID);
   var _loc3_ = DATACENTER.Game.isMultiplayer;
   var _loc1_ = DATACENTER.Game.isRunning;
   var _loc2_ = DATACENTER.Game.isRandom;
   DATACENTER.Game = new Class_DataCenter_Game();
   DATACENTER.Player.reset();
   if(_loc3_)
   {
      if(_loc1_)
      {
         KERNEL.changeToMultiplayer();
      }
      else
      {
         AKS.Channels.join();
         if(!_loc2_)
         {
            AKS.Game.output._parent.showLayer("TabJoinGame");
         }
         else
         {
            AKS.Game.output._parent.showLayer("TabPlayDofusStart");
         }
      }
   }
};
AKS.Game.onInvitation = function(characID, characName)
{
   INTERFACE.onQuestionBoxYes = function()
   {
      AKS.Game.join(AKS.Game.STATE_RANDOM_TEAM,characID);
   };
   INTERFACE.onQuestionBoxNo = function()
   {
      AKS.Game.refuseInvite(characID);
   };
   INTERFACE.questionBox(getText("DO_U_ACCEPT_INVITATION",[characName]));
   SONA.onGameInvitation();
};
AKS.Game.onCancelInvitationResponse = function()
{
   delete INTERFACE.onQuestionBoxYes;
   delete INTERFACE.onQuestionBoxNo;
   INTERFACE.hideQuestionBox();
};
AKS.Game.onInvitationRejected = function(why, whoID, whoName)
{
   AKS.Game.output.onRemoveCharacter(whoID);
   switch(why)
   {
      case "E":
         KERNEL.traceToChat(getText("IMPOSSIBLE_INVITATION",[whoName]),ERROR_CHAT_COLOR);
         break;
      case "C":
         KERNEL.traceToChat(getText("REFUSE_INVITATION",[whoName]),ERROR_CHAT_COLOR);
      default:
         return;
   }
};
AKS.Game.onPositionStart = function(cells)
{
   var _loc2_ = cells;
   DATACENTER.Game.bInSearch = false;
   var cells0 = new Array();
   var cells1 = new Array();
   var _loc1_ = 0;
   var _loc3_ = 0;
   while(_loc3_ < _loc2_[0].length)
   {
      _loc1_ = KERNEL.Compressor.decode64(_loc2_[0].charAt(_loc3_)) << 6;
      _loc1_ += KERNEL.Compressor.decode64(_loc2_[0].charAt(_loc3_ + 1));
      cells0.push(_loc1_);
      _loc3_ += 2;
   }
   _loc3_ = 0;
   while(_loc3_ < _loc2_[1].length)
   {
      _loc1_ = KERNEL.Compressor.decode64(_loc2_[1].charAt(_loc3_)) << 6;
      _loc1_ += KERNEL.Compressor.decode64(_loc2_[1].charAt(_loc3_ + 1));
      cells1.push(_loc1_);
      _loc3_ += 2;
   }
   DATACENTER.Game.allowedCells = [cells0,cells1];
   DATACENTER.Game.m_bRunning = true;
   INTERFACE.clear();
   KERNEL.drawPlayerInterface();
   var team0 = new Array();
   var team1 = new Array();
   var player;
   for(var k in DATACENTER.Game.players.keys)
   {
      player = DATACENTER.Game.players.getItemAt(k);
      if(player.team == 0)
      {
         team0.push(player);
      }
      else
      {
         team1.push(player);
      }
   }
   INTERFACE.drawTeamWatcher(team0,team1);
   DOFUS.onEnterFrame = function()
   {
      AKS.Game.GetMapData();
      delete this.onEnterFrame;
   };
};
AKS.Game.onPlayersCoordinates = function(updatedData)
{
   var _loc2_ = updatedData;
   var _loc3_;
   var cell;
   var dir;
   var characData;
   var clip;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.length)
   {
      _loc3_ = _loc2_[_loc1_][0];
      cell = _loc2_[_loc1_][1];
      dir = _loc2_[_loc1_][2];
      characData = DATACENTER.Characters.getItemAt(_loc3_);
      clip = BATTLEFIELD.Characters.build(characData);
      if(DATACENTER.Game.isMultiplayer)
      {
         if(_loc3_ == DATACENTER.Player.ID)
         {
            stopDrag();
         }
      }
      clip.setPosition(cell,dir);
      _loc1_ = _loc1_ + 1;
   }
};
AKS.Game.onEnd = function(isSender)
{
   if(isSender == DATACENTER.Player.ID)
   {
      this.onActionsFinish(DATACENTER.Player.ID);
   }
   DATACENTER.Game.m_bRunning = false;
   var _loc2_ = DATACENTER.Characters.getItemAt(isSender);
   var _loc1_ = _loc2_.SEQUENCER_actions;
   _loc1_.addAction(false,INTERFACE.UIInterfaceBanner,INTERFACE.UIInterfaceBanner.activateTimeline,[false]);
   _loc1_.addAction(false,AKS.Game.output,AKS.Game.output.stopTimer,[]);
   _loc1_.addAction(false,INTERFACE,INTERFACE.hideTeamWatcher,[]);
   _loc1_.addAction(false,INTERFACE,INTERFACE.hideToolTip,[]);
   _loc1_.addAction(false,INTERFACE,INTERFACE.hideMessageNextTurn,[]);
   _loc1_.addAction(false,SOMA,SOMA.onGameEnd,[]);
   _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,["Fin de partie",INFO_CHAT_COLOR]);
   if(DATACENTER.Game.isRandom)
   {
      _loc1_.addAction(false,INTERFACE.UIInterfaceBanner,INTERFACE.UIInterfaceBanner.showExtraPanel,["GameResultRandom"]);
   }
   else
   {
      _loc1_.addAction(false,INTERFACE.UIInterfaceBanner,INTERFACE.UIInterfaceBanner.showExtraPanel,["GameResultFree"]);
   }
   if(!_loc1_.isPlaying())
   {
      _loc1_.play();
   }
};
AKS.Game.onChangeTeam = function(bool, item, team)
{
   if(bool)
   {
      item.setPlayerTeam(team);
   }
   else
   {
      KERNEL.traceToChat(getText("CANT_CHANGE_TEAM"),ERROR_CHAT_COLOR);
   }
};
AKS.Game.onTurnList = function()
{
   INTERFACE.UIInterfaceBanner.activateTimeline(true);
};
AKS.Game.onStartToPlay = function()
{
   SOMA.onGameStart();
   INTERFACE.hideTeamWatcher();
   INTERFACE.Text.setTextTimer(getText("GAME_LAUNCH",[]),2000,false,true);
   BATTLEFIELD.Selection.unSelectAll();
   BATTLEFIELD.Interaction.setType("move");
   BATTLEFIELD.Interaction.setEnabled(0);
   BATTLEFIELD.Interaction.setLayerVisible(true,0);
   BATTLEFIELD.Interaction.setLayerVisible(false,1);
};
AKS.Game.onStartSearch = function()
{
   AKS.Game.output.maskSearch._visible = true;
   DATACENTER.Game.bInSearch = true;
};
AKS.Game.onTurnStart = function(characID, duration)
{
   var _loc1_ = characID;
   var _loc2_ = DATACENTER.Characters.getItemAt(_loc1_);
   INTERFACE.UIInterfaceBanner.nextTurnTimeline(_loc1_);
   DATACENTER.Game.currentPlayerID = _loc1_;
   AKS.Game.output.startTimer(duration);
   if(_loc1_ == DATACENTER.Player.ID)
   {
      BATTLEFIELD.Interaction.setEnabled(3);
      DATACENTER.Player.SpellsManager.nextTurn();
   }
   KERNEL.cleanPlayer(DATACENTER.Game.lastPlayerID);
   var _loc3_ = _loc1_ != DATACENTER.Player.ID ? "" : " (" + _loc2_.AP + getText("AP") + ")";
   INTERFACE.Text.setTextTimer(getText("PLAYER_TURN",[DATACENTER.Characters.getItemAt(_loc1_).name]) + _loc3_,2000,false,true);
   BATTLEFIELD.Selection.unSelectAll();
};
AKS.Game.onTurnFinish = function(characID)
{
   if(characID == DATACENTER.Player.ID)
   {
      INTERFACE.hideMessageNextTurn();
      BATTLEFIELD.Interaction.setEnabled(0);
   }
   DATACENTER.Game.lastPlayerID = DATACENTER.Game.currentPlayerID;
   DATACENTER.Game.currentPlayerID = null;
   AKS.Game.output.stopTimer();
   KERNEL.cleanUpGameArea(true);
};
AKS.Game.onActionsStart = function(characID)
{
   var _loc2_;
   var _loc1_;
   if(characID == DATACENTER.Player.ID)
   {
      _loc2_ = DATACENTER.Player.data;
      _loc2_.GameActionsManager.m_bNextAction = true;
      if(DATACENTER.Game.isFight)
      {
         _loc1_ = _loc2_.SEQUENCER_actions;
         _loc1_.addAction(false,BATTLEFIELD.Interaction,BATTLEFIELD.Interaction.setEnabled,[0]);
         if(!_loc1_.isPlaying())
         {
            _loc1_.play();
         }
      }
   }
};
AKS.Game.onActionsFinish = function(characID)
{
   var _loc2_;
   var _loc1_;
   if(characID == DATACENTER.Player.ID)
   {
      _loc2_ = DATACENTER.Player.data;
      _loc1_ = _loc2_.SEQUENCER_actions;
      _loc2_.GameActionsManager.m_bNextAction = false;
      _loc2_.GameActionsManager.end(true);
      if(DATACENTER.Game.isFight)
      {
         _loc1_.addAction(false,KERNEL,KERNEL.setEnabledInteractionIfICan,[3]);
         _loc1_.addAction(false,KERNEL,KERNEL.cleanPlayer,[characID]);
         if(!_loc1_.isPlaying())
         {
            _loc1_.play();
         }
      }
   }
};
AKS.Game.onActions = function(Action)
{
   var idAction = Action[0];
   var typeAction = Number(Action[1]);
   var _loc3_ = Action[2];
   var _loc2_ = Action[3];
   var characData = DATACENTER.Characters.getItemAt(_loc3_);
   var _loc1_ = characData.SEQUENCER_actions;
   var GameActionsManager = characData.GameActionsManager;
   GameActionsManager.onServerResponse(idAction);
   switch(typeAction)
   {
      case 1:
         var characData = DATACENTER.Characters.getItemAt(_loc3_);
         var characClip = characData.clip;
         if(characData.SEQUENCER_anim.isPlaying())
         {
            characClip.stopMove();
         }
         var path = KERNEL.Compressor.extractFullPath(_loc2_);
         _loc1_.addAction(true,characClip,characClip.moveCharacterThroughPath,[path,DATACENTER.Game.isMultiplayer]);
         break;
      case 2:
         INTERFACE.Text.setText(getText("LOADING_MAP",[]),false);
         INTERFACE.hideAnimSelection();
         INTERFACE.hideToolTip();
         DOFUS.onEnterFrame = function()
         {
            AKS.Game.GetMapData();
            delete this.onEnterFrame;
         };
         break;
      case 3:
         KERNEL.changeToMultiplayer();
         break;
      case 4:
         var tmpArray = _loc2_.split(",");
         var characClip = DATACENTER.Characters.getItemAt(tmpArray[0]).clip;
         _loc1_.addAction(false,characClip,characClip.setPosition,[tmpArray[1],undefined,false]);
         break;
      case 5:
         var tmpArray = _loc2_.split(",");
         var characData = DATACENTER.Characters.getItemAt(tmpArray[0]);
         var characClip = characData.clip;
         _loc1_.addAction(true,characClip,characClip.slide,[_loc1_,tmpArray[1]]);
         break;
      case 10:
         var tmpArray = _loc2_.split("*");
         var award;
         var type;
         var value;
         i = 0;
         while(i < tmpArray.length)
         {
            award = tmpArray[i];
            type = award.substring(0,1);
            dataStr = award.substr(1);
            switch(type)
            {
               case "G":
                  INTERFACE.msgBox(getText("YOU_FIND_GOLD",[dataStr]));
                  break;
               case "O":
                  var itemData = KERNEL.CharactersManager.getItemObjectFromData(dataStr);
                  DATACENTER.Player.addItem(itemData);
                  INTERFACE.msgBox(getText("YOU_FIND_NEW_ITEM") + " : " + itemData.name);
                  break;
               default:
                  INTERFACE.msgBox(getText("YOU_FIND_SOMTHING"));
            }
            i++;
         }
         break;
      case 100:
         var tmpArray = _loc2_.split(",");
         var characData = DATACENTER.Characters.getItemAt(tmpArray[0]);
         var dLP = Number(tmpArray[1]);
         var txt = dLP >= 0 ? "WIN_LP" : "LOST_LP";
         if(dLP != 0)
         {
            _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText(txt,[characData.name,dLP]),INFO_CHAT_COLOR]);
            _loc1_.addAction(false,characData,characData.updateLP,[dLP]);
         }
         else
         {
            _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("NOCHANGE_LP",[characData.name]),INFO_CHAT_COLOR]);
         }
         break;
      case 101:
      case 102:
         var tmpArray = _loc2_.split(",");
         var characData = DATACENTER.Characters.getItemAt(tmpArray[0]);
         var dAP = Number(tmpArray[1]);
         if(dAP == 0)
         {
            break;
         }
         if(typeAction == 101)
         {
            _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("LOST_AP",[characData.name,dAP]),INFO_CHAT_COLOR]);
         }
         _loc1_.addAction(false,characData,characData.updateAP,[dAP,typeAction == 101]);
         break;
      case 103:
         var characID = _loc2_;
         var characData = DATACENTER.Characters.getItemAt(characID);
         var characClip = characData.clip;
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("DIE",[characData.name]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,INTERFACE.UIInterfaceBanner,INTERFACE.UIInterfaceBanner.removePlayerTimeline,[chracData.num]);
         _loc1_.addAction(true,characClip,characClip.die,[_loc1_]);
         break;
      case 104:
         var characData = DATACENTER.Characters.getItemAt(_loc3_);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("CANT_MOVEOUT"),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,characData.clip,characData.clip.setAnim,["hit"]);
         break;
      case 105:
         var tmpArray = _loc2_.split(",");
         var characData = DATACENTER.Characters.getItemAt(tmpArray[0]);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("REDUCE_DAMAGES",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         break;
      case 106:
         var tmpArray = _loc2_.split(",");
         var characData = DATACENTER.Characters.getItemAt(tmpArray[0]);
         var txt = tmpArray[1] != 1 ? getText("RETURN_SPELL_NO",[characData.name]) : getText("RETURN_SPELL_OK",[characData.name]);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[txt,INFO_CHAT_COLOR]);
         break;
      case 107:
         var tmpArray = _loc2_.split(",");
         var characData = DATACENTER.Characters.getItemAt(tmpArray[0]);
         var txt = getText("RETURN_DAMAGES",[characData.name,tmpArray[1]]);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[txt,INFO_CHAT_COLOR]);
         break;
      case 110:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("BOOST_LIFE_POINTS",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,characData,characData.updateLP,[tmpArray[1]]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,0,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 111:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("BOOST_ACTION_POINTS",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,characData,characData.updateAP,[tmpArray[1],false]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,1,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 112:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("BOOST_DAMAGES",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,16,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 114:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("MULTIPLICATE_DAMAGES",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,17,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 115:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("BOOST_CRITICAL_HIT",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,18,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 117:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("MODERATE_RANGE",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,19,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 118:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("MODERATE_STRENGTH",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,characData,characData.update,["force",Number(tmpArray[1])]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,10,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 119:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("MODERATE_AGILITY",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,characData,characData.update,["agility",Number(tmpArray[1])]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,14,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 120:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,characData,characData.updateLP,[tmpArray[1]]);
         if(tmpArray[0] == _loc3_)
         {
            _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("BOOST_FRIEND_LIFE_POINTS",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         }
         break;
      case 121:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,characData,characData.updateAP,[tmpArray[1]]);
         if(tmpArray[0] == _loc3_)
         {
            _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("BOOST_FRIEND_ACTION_POINTS",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         }
         break;
      case 122:
         if(tmpArray[0] == _loc3_)
         {
            var tmpArray = _loc2_.split(",");
            var characData = DATACENTER.Characters.getItemAt(tmpArray[0]);
            _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("BOOST_FRIEND_DAMAGES",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         }
         break;
      case 123:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("MODERATE_KARMA",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,characData,characData.update,["karma",Number(tmpArray[1])]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,13,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 124:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("MODERATE_CHARISM",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,characData,characData.update,["charism",Number(tmpArray[1])]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,12,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 125:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("MODERATE_VITALITY",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,characData,characData.update,["vitality",Number(tmpArray[1])]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,11,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 126:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("MODERATE_INTELLIGENCE",[characData.name,tmpArray[1]]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,characData,characData.update,["intelligence",Number(tmpArray[1])]);
         _loc1_.addAction(false,KERNEL,KERNEL.addToEffectsManager,[characData,15,tmpArray[1],tmpArray[2],characID == _loc3_]);
         break;
      case 130:
         var tmpArray = _loc2_.split(",");
         var characData = DATACENTER.Characters.getItemAt(_loc3_);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("STEAL_GOLD",[characData.name,tmpArray[0]]),INFO_CHAT_COLOR]);
         break;
      case 150:
         var tmpArray = _loc2_.split(",");
         var characID = tmpArray[0];
         var characData = DATACENTER.Characters.getItemAt(characID);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("INVISIBILITY",[characData.name]),INFO_CHAT_COLOR]);
         break;
      case 200:
         var animParams = _loc2_.split(",");
         _loc1_.addAction(false,KERNEL,KERNEL.ExecuteAnim,[animParams[0],animParams[1]]);
         break;
      case 300:
         var spellParams = _loc2_.split(",");
         var characData = DATACENTER.Characters.getItemAt(_loc3_);
         var characClip = characData.clip;
         var cellNum = spellParams[1];
         var sd = new Class_DataCenter_Spell();
         sd.m_ID = spellParams[0];
         sd.m_AnimID = spellParams[2];
         sd.m_Level = spellParams[3];
         sd.m_bInFrontOfPlayer = spellParams[5] != "1" ? false : true;
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("HAS_LAUNCH_SPELL",[characData.name,getSpellText(sd.m_ID).n]),INFO_CHAT_COLOR]);
         _loc1_.addAction(true,characClip,characClip.cast,[Number(spellParams[4]),sd,{cellFrom:characClip.getCellNum(),cellTo:Number(cellNum)}]);
         if(_loc3_ == DATACENTER.Player.ID)
         {
            var spellsManager = DATACENTER.Player.SpellsManager;
            var characOnID = BATTLEFIELD.Map.getData(cellNum).PlayerOnID;
            var spD = new Class_DataCenter_SpellLaunch(sd.m_ID,characOnID);
            spellsManager.addLaunchedSpell(spD);
         }
         break;
      case 301:
         var spellID = _loc2_;
         var characData = DATACENTER.Characters.getItemAt(_loc3_);
         var characClip = characData.clip;
         _loc1_.addAction(false,SOMA,SOMA.onGameCriticalHit,[]);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[" (" + getText("CRITICAL_HIT") + ")",INFO_CHAT_COLOR,true]);
         _loc1_.addAction(false,characClip,characClip.setAnim,["bonus"]);
         if(characData.num == DATACENTER.Player.ID)
         {
            _loc1_.addAction(false,INTERFACE.UIInterfaceBanner,INTERFACE.UIInterfaceBanner.setPlayerHeadAnim,["smile"]);
         }
         break;
      case 302:
         var spellID = _loc2_;
         var characData = DATACENTER.Characters.getItemAt(_loc3_);
         var characClip = characData.clip;
         _loc1_.addAction(false,SOMA,SOMA.onGameCriticalMiss,[]);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("HAS_LAUNCH_SPELL",[characData.name,getSpellText(spellID).n]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[" (" + getText("CRITICAL_MISS") + ")",INFO_CHAT_COLOR,true]);
         _loc1_.addAction(false,characClip,characClip.say,["Je suis trop nul"]);
         break;
      case 303:
         var destCell = _loc2_;
         var characData = DATACENTER.Characters.getItemAt(_loc3_);
         var characClip = characData.clip;
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("HAS_ATTACK_CC",[characData.name]),INFO_CHAT_COLOR]);
         _loc1_.addAction(true,characClip,characClip.shoot,[destCell]);
         break;
      case 304:
         var characData = DATACENTER.Characters.getItemAt(_loc3_);
         var characClip = characData.clip;
         _loc1_.addAction(false,SOMA,SOMA.onGameCriticalHit,[]);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[" (" + getText("CRITICAL_HIT") + ")",INFO_CHAT_COLOR,true]);
         _loc1_.addAction(false,characClip,characClip.setAnim,["bonus"]);
         break;
      case 305:
         var characData = DATACENTER.Characters.getItemAt(_loc3_);
         var characClip = characData.clip;
         _loc1_.addAction(false,SOMA,SOMA.onGameCriticalMiss,[]);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[getText("HAS_ATTACK_CC",[characData.name]),INFO_CHAT_COLOR]);
         _loc1_.addAction(false,KERNEL,KERNEL.traceToChat,[" (" + getText("CRITICAL_MISS") + ")",INFO_CHAT_COLOR,true]);
         _loc1_.addAction(false,characClip,characClip.say,["Je suis trop nul"]);
   }
   if(!isNaN(Number(idAction)) && _loc3_ == DATACENTER.Player.ID)
   {
      _loc1_.addAction(false,GameActionsManager,GameActionsManager.ack,[idAction]);
   }
   else
   {
      GameActionsManager.end(_loc3_ == DATACENTER.Player.ID);
   }
   if(!_loc1_.isPlaying())
   {
      _loc1_.play();
   }
};
