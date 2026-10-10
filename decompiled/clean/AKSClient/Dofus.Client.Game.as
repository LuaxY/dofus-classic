Class_Client_Game = function(parent)
{
   var _loc1_ = this;
   _loc1_._parent = parent;
   _loc1_.m_bInGame = false;
   _loc1_.STATE_UNKNOWN = 0;
   _loc1_.STATE_SOLO = 1;
   _loc1_.STATE_FREE = 2;
   _loc1_.STATE_RANDOM_TEAM = 3;
   _loc1_.m_MapsList = null;
   _loc1_.m_state = _loc1_.STATE_UNKNOWN;
};
Object.registerClass("Dofus::Client::Game",Class_Client_Game);
Class_Client_Game.prototype.onList = null;
Class_Client_Game.prototype.onCreate = null;
Class_Client_Game.prototype.onJoin = null;
Class_Client_Game.prototype.onMovement = null;
Class_Client_Game.prototype.onMapsList = null;
Class_Client_Game.prototype.onChangeTeam = null;
Class_Client_Game.prototype.send = function(data, bWaiting)
{
   this._parent.send(data,bWaiting);
};
Class_Client_Game.prototype.getList = function(gameType)
{
   this.send("GL" + gameType + "\n");
};
Class_Client_Game.prototype.createFree = function(gameName, gameType, gameMap, gameOptions, gamePassword)
{
   gameType = 2;
   this.send("GC" + gameType + gameName + "|" + gameMap + "|" + gameOptions + "|" + gamePassword + "\n");
};
Class_Client_Game.prototype.createSolo = function()
{
   this.send("GC" + this.STATE_SOLO + "\n");
};
Class_Client_Game.prototype.createRandom = function()
{
   if(!DATACENTER.Game.isRandom)
   {
      this.send("GC" + this.STATE_RANDOM_TEAM + "\n");
   }
};
Class_Client_Game.prototype.invite = function(characID)
{
   this.send("Gi" + characID + "\n",false);
};
Class_Client_Game.prototype.refuseInvite = function(characID)
{
   this.send("GY" + characID + "\n",false);
};
Class_Client_Game.prototype.getMapsList = function()
{
   this.send("BL\n");
};
Class_Client_Game.prototype.GetMapData = function()
{
   INTERFACE.Text.setText(getText("LOADING_MAP",[]),false);
   BATTLEFIELD.Container._visible = false;
   BATTLEFIELD.clear();
   this.send("GD\n");
};
Class_Client_Game.prototype.GetPlayersInformations = function()
{
   this.send("GP\n");
};
Class_Client_Game.prototype.GetPlayersCoordinate = function()
{
   this.send("Gc\n");
};
Class_Client_Game.prototype.join = function(gameType, gameName, gamePassword)
{
   this.send("GJ" + gameType + gameName + "|" + gamePassword + "\n");
};
Class_Client_Game.prototype.getInfos = function()
{
   this.send("GI\n");
};
Class_Client_Game.prototype.start = function()
{
   if(DATACENTER.Game.isFull)
   {
      this.send("GS\n");
   }
};
Class_Client_Game.prototype.startSearch = function()
{
   this.send("Gs\n",false);
};
Class_Client_Game.prototype.ready = function()
{
   this.send("GR\n");
};
Class_Client_Game.prototype.setPlayerPosition = function(cell)
{
   this.send("Gp" + cell + "\n");
};
Class_Client_Game.prototype.sendActions = function(actionType, params)
{
   this.send("GA" + String(actionType).getAddLeftChar("0",3) + params.join(";") + "\n");
};
Class_Client_Game.prototype.leave = function(characID)
{
   this.send("GQ" + (characID != undefined ? characID : "") + "\n");
};
Class_Client_Game.prototype.invitationUndo = function(characID)
{
   this.send("GU" + characID + "\n");
};
Class_Client_Game.prototype.ActionAck = function(idAction)
{
   this.send("GKK" + idAction + "\n",false);
   KERNEL.GameActionsManager.end();
};
Class_Client_Game.prototype.ActionCancel = function(idAction, param)
{
   this.send("GKE" + idAction + "|" + param + "\n",false);
};
Class_Client_Game.prototype.turnEnd = function()
{
   if(DATACENTER.Player.isCurrentPlayer)
   {
      this.send("GT\n",false);
   }
};
Class_Client_Game.prototype.changeTeam = function(team)
{
   if(!DATACENTER.Game.isFull)
   {
      this.send("Gt" + team + "\n");
   }
};
Class_Client_Game.prototype.innerOnCreate = function(success, name, state, params)
{
   var _loc1_ = this;
   var _loc2_ = success;
   var _loc3_ = state;
   DATACENTER.Game = new Class_Datacenter_Game();
   DATACENTER.Player.data.initAP(false);
   DATACENTER.Player.SpellsManager.init();
   DATACENTER.Player.data.EffectsManager.init();
   KERNEL.CharactersManager.clearAllOthersCharacters();
   switch(Number(_loc3_))
   {
      case _loc1_.STATE_SOLO:
         DATACENTER.Game.state = _loc3_;
         DATACENTER.Game.currentPlayerID = DATACENTER.Player.ID;
         _loc1_.onCreateSolo(_loc2_,params);
         return;
      case _loc1_.STATE_FREE:
      case _loc1_.STATE_RANDOM_TEAM:
         _loc1_.innerOnJoin(_loc2_,name,_loc3_,params,true);
         return;
      default:
         if(!_loc2_)
         {
            _loc1_.onCreateMulti(false,params);
            return;
         }
         return;
   }
};
Class_Client_Game.prototype.innerOnJoin = function(success, name, state, params, bCreator)
{
   var _loc1_ = this;
   var _loc2_ = params;
   var _loc3_ = state;
   DATACENTER.Game = new Class_Datacenter_Game();
   DATACENTER.Player.data.initAP(false);
   DATACENTER.Player.SpellsManager.init();
   DATACENTER.Player.data.EffectsManager.init();
   KERNEL.CharactersManager.clearAllOthersCharacters();
   if(!success)
   {
      _loc1_.onJoin(false,_loc2_);
   }
   else
   {
      switch(Number(_loc3_))
      {
         case _loc1_.STATE_FREE:
            DATACENTER.Game.state = _loc3_;
            DATACENTER.Game.m_name = name;
            DATACENTER.Game.m_maxPlayerCount = _loc2_[1].charCodeAt(0) - 64 + (_loc2_[1].charCodeAt(1) - 64);
            _loc1_.onJoin(true,_loc2_,bCreator);
            break;
         case _loc1_.STATE_RANDOM_TEAM:
            DATACENTER.Game.m_name = getText("RANDOM");
            DATACENTER.Game.state = _loc3_;
            _loc1_.onJoinRandom(bCreator);
         default:
            return;
      }
   }
};
Class_Client_Game.prototype.innerOnMovement = function(data)
{
   var dataArray = data.split("|");
   var len = dataArray.length;
   var i = 1;
   var _loc1_;
   var _loc2_;
   var _loc3_;
   while(i < len)
   {
      var str = dataArray[i];
      if(str.length == 0)
      {
         break;
      }
      if(str.charAt(0) == "+")
      {
         _loc1_ = str.substring(1).split(";");
         var c;
         bAdd = true;
         if(_loc1_[0] == 0)
         {
            c = {num:0};
         }
         else
         {
            _loc2_ = new Object();
            _loc2_.level = _loc1_[2];
            _loc2_.guild = _loc1_[3];
            _loc2_.sex = _loc1_[4];
            _loc2_.gfxID = _loc1_[5];
            _loc2_.color1 = _loc1_[6];
            _loc2_.color2 = _loc1_[7];
            _loc2_.color3 = _loc1_[8];
            _loc2_.weapon = _loc1_[9];
            if(!DATACENTER.Game.isMultiplayer)
            {
               _loc2_.cell = _loc1_[10];
               _loc2_.dir = _loc1_[11];
            }
            if(DATACENTER.Game.isMultiplayer)
            {
               _loc2_.LP = _loc1_[10];
               _loc2_.team = _loc1_[11];
               _loc2_.joinPosition = _loc1_[12];
            }
            var c = KERNEL.CharactersManager.createCharacter(_loc1_[0],_loc1_[1],_loc2_);
         }
         this.onMovement(bAdd,c);
      }
      else
      {
         bAdd = false;
         _loc3_ = dataArray[1].substring(1);
         var c;
         if(_loc3_ == 0)
         {
            c = {num:0};
         }
         else
         {
            c = DATACENTER.Characters.getItemAt(_loc3_);
         }
         this.onMovement(bAdd,c);
         if(_loc3_ != 0)
         {
            DATACENTER.Characters.setItemAt(_loc3_,undefined);
         }
      }
      i++;
   }
};
Class_Client_Game.prototype.innerOnMapsList = function(list)
{
   var _loc1_ = this;
   _loc1_.m_MapsList = list.split("|");
   _loc1_.onMapsList(_loc1_.m_MapsList);
};
Class_Client_Game.prototype.innerOnMapData = function(data)
{
   var _loc1_ = data.split("|");
   var _loc3_ = _loc1_[1];
   var width = _loc1_[2];
   var height = _loc1_[3];
   var _loc2_ = _loc1_[4] != "1" ? false : true;
   var backgroundNum = _loc1_[5];
   var mapData = _loc1_[6];
   this.onMapData(_loc3_,width,height,_loc2_,backgroundNum,mapData);
};
Class_Client_Game.prototype.innerOnCellData = function(data)
{
   var _loc1_ = data.split("|");
   var _loc2_ = Number(_loc1_[0].substr(3));
   var _loc3_ = _loc1_[1].substring(0,10);
   var mask = _loc1_[1].substring(10,20);
   this.onCellData(_loc2_,_loc3_,mask);
};
Class_Client_Game.prototype.innerOnMapInformations = function(data)
{
   var _loc1_ = data.split("|");
   var state = Number(_loc1_[1]);
   DATACENTER.Game.m_maxPlayerCount = _loc1_[4].charCodeAt(0) - 64 + (_loc1_[4].charCodeAt(1) - 64);
   this.onMapInformations({gameName:_loc1_[2],gameMap:_loc1_[3],gameOptions:_loc1_[4]});
};
Class_Client_Game.prototype.innerOnActions = function(data)
{
   this.onActions(data.substr(2).split(";"));
};
Class_Client_Game.prototype.innerOnPlayersCoordinates = function(data)
{
   var _loc2_ = data.split("|");
   var updatedData = new Array();
   var _loc3_;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.length)
   {
      _loc3_ = _loc2_[_loc1_].split(";");
      updatedData.push(_loc3_);
      _loc1_ = _loc1_ + 1;
   }
   this.onPlayersCoordinates(updatedData);
};
Class_Client_Game.prototype.innerOnPlayersInformations = function(data)
{
   var Players = data.split("|");
   var _loc1_;
   var _loc2_ = 0;
   var _loc3_;
   while(_loc2_ < Players.length)
   {
      _loc1_ = Players[_loc2_].split(";");
      var ID = _loc1_[0];
      _loc3_ = _loc1_[1];
      var Guild = _loc1_[2];
      var Color1 = _loc1_[3];
      var Color2 = _loc1_[4];
      var Color3 = _loc1_[5];
      var LP = _loc1_[6];
      var AP = _loc1_[7];
      var GP = _loc1_[8];
      var team = _loc1_[11];
      KERNEL.CharactersManager.createCharacter(ID,_loc3_,Guild,Color1,Color2,Color3,LP,AP,GP);
      _loc2_ = _loc2_ + 1;
   }
};
Class_Client_Game.prototype.innerOnPositionStart = function(codeSubAction, data)
{
   if(codeSubAction === 83)
   {
      this.onPositionStart(data);
   }
};
Class_Client_Game.prototype.innerOnTurnStart = function(data)
{
   var _loc1_ = data.split("|");
   this.onTurnStart(_loc1_[0],Number(_loc1_[1]) / 1000);
};
Class_Client_Game.prototype.innerOnTurnFinish = function(characID)
{
   this.onTurnFinish(characID);
};
Class_Client_Game.prototype.innerOnTurnlist = function(characIDList)
{
   DATACENTER.Game.turnSequence = characIDList.split("|");
   this.onTurnList();
};
Class_Client_Game.prototype.innerOnChangeTeam = function(bool, playerID, team)
{
   var _loc1_;
   var _loc2_;
   if(bool)
   {
      _loc1_ = DATACENTER.Characters.getItemAt(playerID);
      _loc1_.team = Number(team);
      _loc2_ = AKS.Game.output.players["player" + _loc1_.joinPosition];
      this.onChangeTeam(true,_loc2_,team);
   }
   else
   {
      this.onChangeTeam(false);
   }
};
Class_Client_Game.prototype.innerOnEnd = function(data)
{
   var dataArray = data.split("|");
   var _loc2_;
   var _loc1_;
   var idSender;
   var bWinner;
   idSender = dataArray.shift(0);
   DATACENTER.Game.Results = new Object();
   DATACENTER.Game.Results.winners = new Array();
   DATACENTER.Game.Results.losers = new Array();
   var _loc3_ = 0;
   while(_loc3_ < dataArray.length)
   {
      _loc2_ = dataArray[_loc3_].split(";");
      bWinner = _loc2_[0] != "2" ? false : true;
      _loc1_ = new Object();
      _loc1_.id = _loc2_[1];
      _loc1_.name = DATACENTER.Characters.getItemAt(_loc1_.id).name;
      _loc1_.level = Number(_loc2_[2]);
      _loc1_.bDead = _loc2_[3] != "1" ? false : true;
      _loc1_.lowXp = Number(_loc2_[4]);
      _loc1_.xp = Number(_loc2_[5]);
      _loc1_.fullxp = _loc1_.lowxp + _loc1_.xp;
      _loc1_.highXp = Number(_loc2_[6]);
      _loc1_.winxp = Number(_loc2_[7]);
      _loc1_.gold = Number(_loc2_[8]);
      if(bWinner)
      {
         DATACENTER.Game.Results.winners.push(_loc1_);
      }
      else
      {
         DATACENTER.Game.Results.losers.push(_loc1_);
      }
      if(_loc1_.id == DATACENTER.Player.ID)
      {
         DATACENTER.Player.data.XP = _loc1_.fullxp;
      }
      _loc3_ = _loc3_ + 1;
   }
   this.onEnd(idSender);
};
Class_Client_Game.prototype.innerOnInvitationDemandRejected = function(data)
{
   var why = data.substring(0,1);
   var _loc1_ = data.substr(1).split("|");
   var _loc2_ = _loc1_[1];
   var _loc3_ = _loc1_[0];
   this.onInvitationRejected(why,_loc3_,_loc2_);
};
Class_Client_Game.prototype.innerOnInvitationResponse = function(data)
{
   var _loc1_ = data.split("|");
   var _loc2_ = _loc1_[0];
   var _loc3_ = _loc1_[1];
   this.onInvitation(_loc2_,_loc3_);
};
