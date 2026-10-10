Class_Kernel = function()
{
   this.init();
};
Class_Kernel.prototype.init = function()
{
   var _loc1_ = this;
   DOFUS.createEmptyMovieClip("debug",9999999);
   _loc1_.PathFinding = new Class_PathFinding();
   _loc1_.Compressor = new Class_Compressor();
   _loc1_.KeyListener = new Class_KeyListener();
   _loc1_.CharactersManager = new Class_CharactersManager();
   DOFUS.createEmptyMovieClip("Interfaces",3);
   DOFUS.Interfaces.loadMovie(MODULE_PATH + "Interfaces.swf");
   DOFUS.Interfaces.onInitFrame = function()
   {
      DOFUS.createEmptyMovieClip("lang",5000);
      System.security.allowDomain(SITE_PATH);
      DOFUS.lang.onInitFrame = function()
      {
         this.checkLanguage("fr",SHARED_OBJECT,INTERFACE,KERNEL);
      };
      DOFUS.lang.loadMovie(HTTP_LANG_PATH);
   };
   DOFUS.createEmptyMovieClip("SoundManager",4);
   DOFUS.SoundManager.loadMovie(MODULE_PATH + "Sound.swf");
};
Class_Kernel.prototype.onLangOK = function()
{
   var _loc1_ = this;
   _loc1_.m_LoadVars = new LoadVars();
   _loc1_.m_LoadVars.onLoad = function(success)
   {
      var _loc1_ = this;
      INTERFACE.hideProgressBar();
      if(success)
      {
         if(_loc1_.l != undefined)
         {
            DATACENTER.Player.login = _loc1_.l;
            DATACENTER.Player.password = _loc1_.p;
            AKS.connect(SERVER_NAME,SERVER_PORT);
         }
         else
         {
            INTERFACE.drawLoginInterface();
         }
      }
      else
      {
         INTERFACE.drawLoginInterface();
      }
   };
   _loc1_.m_LoadVars.sendAndLoad("http://" + SITE_PATH + "/files/login/getuser.php",_loc1_.m_LoadVars,"POST");
};
Class_Kernel.prototype.drawCurrentMap = function()
{
   DOFUS.t = getTimer();
   BATTLEFIELD.clear();
   BATTLEFIELD.Container._visible = false;
   BATTLEFIELD.Map.build(DATACENTER.Map);
};
Class_Kernel.prototype.ExecuteAnim = function(cell, state)
{
   BATTLEFIELD.Objects.list["object" + cell].setAnim("state" + state);
};
Class_Kernel.prototype.traceToChat = function(txt, color, bSameLine)
{
   if(AKS.Chat.output == undefined)
   {
      log(txt,true);
   }
   else
   {
      CHAT.addText(txt,color);
   }
};
Class_Kernel.prototype.drawPlayerInterface = function()
{
   INTERFACE.removeAllListener();
   var _loc1_ = INTERFACE.draw("Interface::Banner",200);
   _loc1_.onAddUsedSpell = function(oldPosition, spellData)
   {
      var _loc1_ = spellData;
      var _loc2_ = oldPosition;
      if(_loc2_)
      {
         this.banner["us" + _loc2_].container.setItem(null);
         DATACENTER.Player.SpellsUsed.deleteItemAt(_loc2_);
      }
      DATACENTER.Player.SpellsUsed.setItemAt(_loc1_.m_Position,_loc1_);
      AKS.Spells.moveToUsed(_loc1_.m_ID,_loc1_.m_Position);
   };
   _loc1_.onWantBootSpell = function(spellData)
   {
      AKS.Spells.getInfos(spellData.m_ID);
   };
};
Class_Kernel.prototype.drawTeamWacher = function(team0, team1)
{
   INTERFACE.drawTeamWatcher(team0,team1);
};
Class_Kernel.prototype.changeToMultiplayer = function()
{
   DATACENTER.Player.data.initAP();
   DATACENTER.Player.data.initLP();
   BATTLEFIELD.Container._visible = false;
   BATTLEFIELD.clear();
   INTERFACE.clear();
   INTERFACE.draw("Interface::MultiPlayer",1);
   SOMA.onEnterMulti();
};
Class_Kernel.prototype.switchToSpellLaunch = function(spellData)
{
   var _loc3_ = spellData;
   var _loc2_;
   var _loc1_;
   if(DATACENTER.Game.isFight)
   {
      if(!DATACENTER.Player.data.GameActionsManager.isWaiting())
      {
         if(!DATACENTER.Player.hasEnoughAP(_loc3_.m_APCost))
         {
            KERNEL.traceToChat(getText("NOT_ENOUGH_AP"),ERROR_CHAT_COLOR);
         }
         else if(!DATACENTER.Player.SpellsManager.checkCanLaunchSpell(_loc3_.m_ID,undefined))
         {
            if(BATTLEFIELD.Interaction.errorMessage != undefined)
            {
               KERNEL.traceToChat(BATTLEFIELD.Interaction.errorMessage,ERROR_CHAT_COLOR);
               delete BATTLEFIELD.Interaction.errorMessage;
            }
         }
         else
         {
            BATTLEFIELD.Selection.unSelectAll();
            DATACENTER.Player.currentSpell = _loc3_;
            BATTLEFIELD.Pointer.clearAll();
            _loc2_ = _loc3_.m_EffectZones;
            if(_loc3_.m_Range != 63)
            {
               var rangeModerator = DATACENTER.Player.data.EffectsManager.getModeratorValue(19);
               var range = _loc3_.m_Range + rangeModerator;
               if(range < 0)
               {
                  range = 0;
               }
               _loc1_ = 0;
               while(_loc1_ < _loc2_.length)
               {
                  BATTLEFIELD.Pointer.addShape(_loc2_[_loc1_].shape,_loc2_[_loc1_].size,CELL_SPELL_EFFECT_COLOR);
                  _loc1_ = _loc1_ + 1;
               }
               if(_loc3_.m_bLineOnly)
               {
                  BATTLEFIELD.Pointer.drawFixedCross(range,CELL_SPELL_RANGE_COLOR,DATACENTER.Player.clip.getCellNum());
               }
               else
               {
                  BATTLEFIELD.Pointer.drawFixedCircle(range,CELL_SPELL_RANGE_COLOR,DATACENTER.Player.clip.getCellNum());
               }
            }
            else
            {
               BATTLEFIELD.Pointer.drawFixedRect(CELL_SPELL_RANGE_COLOR);
            }
            BATTLEFIELD.Interaction.setType("spell");
            var c = INTERFACE.setCursor(_loc3_.iconFile);
            c.onClearCursor = function()
            {
               BATTLEFIELD.Pointer.clearAll();
               delete this.onClearCursor;
            };
            BATTLEFIELD.Interaction.onMouseUp = function()
            {
               var _loc1_ = this;
               _loc1_.setType("move");
               delete _loc1_.onMouseUp;
               Mouse.removeListener(_loc1_);
            };
            Mouse.addListener(BATTLEFIELD.Interaction);
            this.forceOver();
         }
      }
   }
};
Class_Kernel.prototype.switchToCC = function(CCData)
{
   var _loc1_ = this;
   var _loc3_ = CCData;
   var _loc2_;
   if(BATTLEFIELD.Interaction.isEnable())
   {
      if(DATACENTER.Game.isFight)
      {
         if(!DATACENTER.Player.data.GameActionsManager.isWaiting())
         {
            if(!DATACENTER.Player.hasEnoughAP(_loc3_.m_APCost))
            {
               KERNEL.traceToChat(getText("NOT_ENOUGH_AP"),ERROR_CHAT_COLOR);
            }
            else
            {
               BATTLEFIELD.Selection.unSelectAll();
               DATACENTER.Player.currentSpell = _loc3_;
               BATTLEFIELD.Pointer.clearAll();
               BATTLEFIELD.Pointer.addShape("C",0,CELL_SPELL_EFFECT_COLOR);
               BATTLEFIELD.Pointer.drawFixedCircle(1,CELL_SPELL_RANGE_COLOR,DATACENTER.Player.clip.getCellNum());
               BATTLEFIELD.Interaction.setType("cc");
               _loc2_ = INTERFACE.setCursor(_loc3_.iconFile);
               _loc2_.onClearCursor = function()
               {
                  BATTLEFIELD.Pointer.clearAll();
                  delete this.onClearCursor;
               };
               BATTLEFIELD.Interaction.onMouseUp = function()
               {
                  var _loc1_ = this;
                  _loc1_.setType("move");
                  delete _loc1_.onMouseUp;
                  Mouse.removeListener(_loc1_);
               };
               Mouse.addListener(BATTLEFIELD.Interaction);
               _loc1_.forceOver();
            }
         }
      }
   }
};
Class_Kernel.prototype.cleanUpGameArea = function(bkeepSelection)
{
   INTERFACE.setCursor(null);
   INTERFACE.setSpellCursor(null);
   if(bkeepSelection)
   {
      BATTLEFIELD.Selection.unSelectAll();
   }
   BATTLEFIELD.Pointer.clearAll();
   DATACENTER.Player.currentSpell = null;
   BATTLEFIELD.Interaction.setType("move");
   KERNEL.PathFinding.setInitState(DATACENTER.Game.isFight);
};
Class_Kernel.prototype.cleanPlayer = function(characID)
{
   var _loc2_ = characID;
   var _loc1_;
   if(_loc2_ != DATACENTER.Game.currentPlayerID)
   {
      _loc1_ = DATACENTER.Characters.getItemAt(_loc2_);
      _loc1_.EffectsManager.nextTurn();
      _loc1_.initAP();
      _loc1_.GameActionsManager.init();
      if(_loc2_ == DATACENTER.Player.ID)
      {
         INTERFACE.hideMessageNextTurn();
      }
   }
};
Class_Kernel.prototype.setEnabledInteractionIfICan = function(state)
{
   if(DATACENTER.Player.isCurrentPlayer)
   {
      BATTLEFIELD.Interaction.setEnabled(state);
   }
};
Class_Kernel.prototype.forceOver = function()
{
   DOFUS.attachMovie("clipOver","clipOver",10,{_x:DOFUS._xmouse,_y:DOFUS._ymouse});
};
Class_Kernel.prototype.animAllCharacters = function(anim)
{
   var _loc3_ = anim;
   var _loc2_;
   var _loc1_;
   for(var k in DATACENTER.Characters.keys)
   {
      _loc1_ = DATACENTER.Characters.getItemAt(k);
      _loc2_ = _loc1_.clip;
      if(!_loc1_.iDied)
      {
         _loc2_.setAnim(_loc3_);
      }
   }
};
Class_Kernel.prototype.addToEffectsManager = function(characData, type, value, turnCount, bOnItSelf)
{
   var _loc2_ = characData.EffectsManager;
   var _loc1_ = new Class_DataCenter_Effect();
   _loc1_.type = type;
   _loc1_.value = value;
   _loc1_.remainingTurn = !bOnItSelf ? Number(turnCount) - 1 : turnCount;
   _loc2_.addEffect(_loc1_);
};
Class_Kernel.prototype.quit = function()
{
   INTERFACE.onQuestionBoxYes = function()
   {
      AKS.disconnect(true);
      AKS.m_bSkipMenu = true;
      AKS.connect(SERVER_NAME,SERVER_PORT);
   };
   INTERFACE.questionBox(getText("DO_U_QUIT"));
};
Class_Kernel.prototype.disconnect = function()
{
   INTERFACE.onQuestionBoxYes = function()
   {
      AKS.disconnect();
   };
   INTERFACE.questionBox(getText("DO_U_DISCONNECT"));
};
Class_Kernel.prototype.showSoundOptions = function()
{
   INTERFACE.optionsBox();
};
Class_Kernel.prototype.showMenu = function()
{
   INTERFACE.menuBox();
};
Class_Kernel.prototype.giveUpGame = function()
{
   INTERFACE.onQuestionBoxYes = function()
   {
      AKS.Game.leave();
      KERNEL.changeToMultiplayer();
   };
   INTERFACE.questionBox(getText("DO_U_GIVEUP"));
};
