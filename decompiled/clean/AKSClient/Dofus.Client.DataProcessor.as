Class_Client_DataProcessor = function(parent)
{
   this._parent = parent;
};
Object.registerClass("Dofus::Client::DataProcessor",Class_Client_DataProcessor);
Class_Client_DataProcessor.prototype.process = function(data)
{
   var _loc2_ = this;
   var _loc3_ = data;
   log(">> " + _loc3_);
   log(">> " + _loc3_,true);
   INTERFACE.MainLayer_mc.waiting.close();
   var codeRubrique = _loc3_.charCodeAt(0);
   var codeAction = _loc3_.charCodeAt(1);
   if(_loc3_.charCodeAt(2) == 75)
   {
      codeErreur = false;
   }
   else
   {
      codeErreur = true;
   }
   var msg;
   var i;
   var _loc1_;
   loop2:
   switch(codeRubrique)
   {
      case 72:
         _loc2_._parent.m_UID = _loc3_.substr(1);
         _loc2_._parent.m_bConnected = true;
         _loc2_._parent.onConnect(true);
         break;
      case 77:
         _loc2_._parent.m_serverMessageID = _loc3_.substr(2);
         _loc2_._parent.onServerMessage(_loc3_.substring(1,2),_loc3_.substr(2));
         break;
      case 109:
         _loc2_._parent.Game.innerOnMapsList(_loc3_.substr(2));
         break;
      case 73:
         switch(codeAction)
         {
            case 67:
               _loc2_._parent.Infos.innerOnPlayerCount(_loc3_.substr(2));
               break;
            case 80:
               _loc2_._parent.Infos.innerOnPodium(_loc3_.substr(2));
               break;
            case 71:
               _loc2_._parent.Infos.innerOnGeneral(_loc3_.substr(2));
         }
         break;
      case 83:
         switch(codeAction)
         {
            case 73:
               _loc2_._parent.Spells.innerOnInfos(_loc3_.substr(2));
               break;
            case 77:
               _loc2_._parent.Spells.innerOnMovement(_loc3_);
               break;
            case 85:
               if(!codeErreur)
               {
                  _loc2_._parent.Spells.innerOnUpgradeSpell(_loc3_.substr(3));
               }
         }
         break;
      case 65:
         switch(codeAction)
         {
            case 108:
               if(!codeErreur)
               {
                  _loc2_._parent.m_bAuthentified = true;
                  _loc2_._parent.onLogin(true,null,_loc3_.substr(3));
               }
               else
               {
                  errNumber = _loc3_.charCodeAt(3);
                  switch(errNumber)
                  {
                     case 97:
                        msg = getText("ALREADY_LOGGED");
                        break;
                     case 118:
                        msg = getText("BAD_VERSION",[VERSION]);
                        _loc2_._parent.onBadVersion();
                        break;
                     default:
                        msg = getText("ACCESS_DENIED");
                  }
                  _loc2_._parent.onLogin(false,msg,codeErreur);
               }
               break;
            case 87:
               var whoisData = _loc3_.split("|");
               var __characterName;
               var __playerName;
               var __state;
               var __param;
               if(whoisData.length == 2)
               {
                  _loc2_._parent.Account.onWhoIs(whoisData[1],"!",null);
                  break;
               }
               if(whoisData.length != 6)
               {
                  trace("Infos Whois Erronées");
                  break;
               }
               __playerName = whoisData[1];
               __characterName = whoisData[2];
               __state = whoisData[3];
               __param = whoisData[4];
               if(__playerName == _loc2_._parent.m_login)
               {
                  _loc2_._parent.Account.onWhoAmI(__playerName,__characterName,__state,__param);
               }
               else
               {
                  _loc2_._parent.Account.onWhoIs(__playerName,__characterName,__state,__param);
               }
               break;
            case 76:
               if(codeErreur)
               {
                  break;
               }
               var returnArray = new Array();
               var dataArray = _loc3_.split("|");
               i = 1;
               while(i < dataArray.length)
               {
                  var tmpObj = dataArray[i].split(";");
                  _loc1_ = new Object();
                  _loc1_.id = Number(tmpObj[0]);
                  _loc1_.name = tmpObj[1];
                  _loc1_.level = tmpObj[2];
                  _loc1_.model = tmpObj[3];
                  _loc1_.sex = tmpObj[4];
                  _loc1_.gfxID = tmpObj[5];
                  _loc1_.color1 = tmpObj[6] != -1 ? Number("0x" + tmpObj[6]) : tmpObj[6];
                  _loc1_.color2 = tmpObj[7] != -1 ? Number("0x" + tmpObj[7]) : tmpObj[7];
                  _loc1_.color3 = tmpObj[8] != -1 ? Number("0x" + tmpObj[8]) : tmpObj[8];
                  _loc1_.file = CLIPS_PERSOS_PATH + _loc1_.gfxID + ".swf";
                  returnArray.push(_loc1_);
                  i++;
               }
               _loc2_._parent.Account.onGetCharacters(returnArray);
               break;
            case 83:
               if(!codeErreur)
               {
                  var dataArray = _loc3_.split("|");
                  if(dataArray.length != 31)
                  {
                     _loc2_._parent.Account.onSetCharacter(false,"Retour bizarre lors de la sélection du personnage");
                  }
                  else
                  {
                     _loc2_._parent.Account.isSet = false;
                     var c = new Object();
                     c.level = dataArray[3];
                     c.guild = dataArray[4];
                     c.sex = dataArray[5];
                     c.gfxID = dataArray[6];
                     c.color1 = dataArray[7];
                     c.color2 = dataArray[8];
                     c.color3 = dataArray[9];
                     c.weapon = dataArray[10];
                     c.XPlow = dataArray[11];
                     c.XP = dataArray[12];
                     c.XPhigh = dataArray[13];
                     c.LP = dataArray[14];
                     c.AP = dataArray[15];
                     c.GP = dataArray[16];
                     c.force = dataArray[17];
                     c.vitality = dataArray[18];
                     c.rFire = dataArray[19];
                     c.rAir = dataArray[20];
                     c.rWater = dataArray[21];
                     c.rEarth = dataArray[22];
                     c.charism = dataArray[23];
                     c.karma = dataArray[24];
                     c.agility = dataArray[25];
                     c.intelligence = dataArray[26];
                     c.bonusPoints = dataArray[27];
                     c.cc = dataArray[28];
                     c.spells = dataArray[29];
                     c.items = dataArray[30];
                     KERNEL.CharactersManager.createCharacter(dataArray[1],dataArray[2],c);
                     DATACENTER.Player.ID = dataArray[1];
                     DATACENTER.Player.name = dataArray[2];
                     _loc2_._parent.Account.onSetCharacter(true,"");
                  }
               }
               else
               {
                  _loc2_._parent.Account.onSetCharacter(false,"Erreur lors de la sélection du personnage");
               }
               break;
            case 78:
               _loc2_._parent.Account.innerOnNewLevel(_loc3_.substr(2));
               break;
            case 66:
               _loc2_._parent.Account.innerOnBoost(_loc3_.substr(3));
               break;
            case 65:
               _loc2_._parent.Account.onAddCharacter(!codeErreur);
         }
         break;
      case 67:
         switch(codeAction)
         {
            case 74:
               var channelName = _loc3_.substring(3);
               DATACENTER.Channel.m_name = channelName;
               _loc2_._parent.Channels.onJoin(channelName,!codeErreur);
               break;
            case 77:
               _loc2_._parent.Channels.innerOnMovement(_loc3_);
               break;
            case 76:
               _loc2_._parent.Channels.innerOnList(_loc3_.substr(2));
         }
         break;
      case 71:
         switch(codeAction)
         {
            case 67:
               var dataArray = _loc3_.split("|");
               if(codeErreur)
               {
                  _loc2_._parent.Game.innerOnCreate(false,null,null,_loc3_.charAt(3));
               }
               else
               {
                  DATACENTER.Channel.m_name = null;
                  var __name;
                  var __state;
                  var __params;
                  __state = Number(dataArray[1]);
                  __name = dataArray[2];
                  __params = dataArray.slice(3,dataArray.length);
                  _loc2_._parent.Game.innerOnCreate(true,__name,__state,__params);
               }
               break;
            case 74:
               var dataArray = _loc3_.split("|");
               if(codeErreur)
               {
                  _loc2_._parent.Game.innerOnJoin(false,null,null,_loc3_.charAt(3),false);
               }
               else
               {
                  DATACENTER.Channel.m_name = null;
                  var __name;
                  var __state;
                  var __params;
                  __state = Number(dataArray[1]);
                  __name = dataArray[2];
                  __params = dataArray.slice(3,dataArray.length);
                  _loc2_._parent.Game.innerOnJoin(true,__name,__state,__params,false);
               }
               break;
            case 69:
               _loc2_._parent.Game.innerOnEnd(_loc3_.substr(2));
               break;
            case 76:
               var list = _loc3_.split("|");
               var returnArray = new Array();
               if(list.length < 2)
               {
                  _loc2_._parent.Game.onList(returnArray);
               }
               i = 1;
               while(i < list.length)
               {
                  _loc1_ = new Object();
                  var tmpObj = list[i].split(";");
                  _loc1_.name = tmpObj[0];
                  _loc1_.maxPlayersCount = tmpObj[1].charCodeAt(0) - 64 + (tmpObj[1].charCodeAt(0) - 64);
                  _loc1_.playersCount = tmpObj[1].charCodeAt(2) - 64;
                  returnArray.push(_loc1_);
                  i++;
               }
               _loc2_._parent.Game.onList(returnArray);
               break;
            case 73:
               switch(_loc3_.charCodeAt(2))
               {
                  case 77:
                     _loc2_._parent.Game.innerOnMapInformations(_loc3_);
                     break;
                  case 80:
                     _loc2_._parent.Game.innerOnPlayersInformations(_loc3_.substring(4,_loc3_.length));
                     break;
                  case 67:
                     _loc2_._parent.Game.innerOnPlayersCoordinates(_loc3_.substring(4,_loc3_.length));
               }
               break;
            case 77:
               _loc2_._parent.Game.innerOnMovement(_loc3_);
               break;
            case 86:
               _loc2_._parent.Game.onLeave();
               break;
            case 68:
               switch(_loc3_.charCodeAt(2))
               {
                  case 77:
                     _loc2_._parent.Game.innerOnMapData(_loc3_);
                     break;
                  case 67:
                     _loc2_._parent.Game.innerOnCellData(_loc3_);
               }
               break;
            case 65:
               switch(_loc3_.charCodeAt(2))
               {
                  case 83:
                     _loc2_._parent.Game.onActionsStart(_loc3_.substr(3));
                     break;
                  case 70:
                     _loc2_._parent.Game.onActionsFinish(_loc3_.substr(3));
                     break;
                  default:
                     _loc2_._parent.Game.innerOnActions(_loc3_);
               }
               break;
            case 80:
               _loc2_._parent.Game.innerOnPositionStart(_loc3_.charCodeAt(2),_loc3_.substr(3).split("|"));
               break;
            case 82:
               _loc2_._parent.Game.onEverybodyIsReady();
               break;
            case 83:
               _loc2_._parent.Game.onStartToPlay();
               break;
            case 115:
               _loc2_._parent.Game.onStartSearch();
               break;
            case 84:
               switch(_loc3_.charCodeAt(2))
               {
                  case 83:
                     _loc2_._parent.Game.innerOnTurnStart(_loc3_.substr(3));
                     break;
                  case 70:
                     _loc2_._parent.Game.innerOnTurnFinish(_loc3_.substr(3));
                     break;
                  case 76:
                     _loc2_._parent.Game.innerOnTurnlist(_loc3_.substr(4));
               }
               break;
            case 116:
               var dataArray = _loc3_.substr(3).split("|");
               if(codeErreur || dataArray.length < 2)
               {
                  _loc2_._parent.Game.innerOnChangeTeam(false);
               }
               else
               {
                  var __playerID = dataArray[0];
                  var __team = dataArray[1];
                  _loc2_._parent.Game.innerOnChangeTeam(true,__playerID,__team);
               }
               break;
            case 105:
               _loc2_._parent.Game.innerOnInvitationDemandRejected(_loc3_.substr(2));
               break;
            case 89:
               _loc2_._parent.Game.innerOnInvitationResponse(_loc3_.substr(2));
               break;
            case 121:
               _loc2_._parent.Game.onCancelInvitationResponse();
         }
         break;
      case 99:
         switch(codeAction)
         {
            case 77:
               if(!codeErreur)
               {
                  var msgData = _loc3_.split("|");
                  _loc2_._parent.Chat.onMessage(msgData[3],msgData[2],msgData[1],_loc3_.charCodeAt(3));
                  break loop2;
               }
               errNumber = _loc3_.charCodeAt(3);
               if(errNumber == 83)
               {
                  _loc2_._parent.Chat.onError(getText("SYNTAX_ERROR",[" /w <" + getText("NAME",[]) + "> <" + getText("MSG",[]) + ">"]));
               }
               else
               {
                  _loc2_._parent.Chat.onError(getText("USER_NOT_CONNECTED",[_loc3_.substring(4)]));
               }
               break loop2;
            case 83:
               _loc2_._parent.Chat.innerOnSmiley(_loc3_.substr(2));
               break loop2;
            default:
               break loop2;
         }
      case 70:
         break;
      case 82:
         switch(codeAction)
         {
            case 67:
               if(codeErreur)
               {
                  _loc2_._parent.RandomGame.innerOnCreate(false,_loc3_.substr(3));
               }
               else
               {
                  _loc2_._parent.RandomGame.innerOnCreate(true,_loc3_.substr(3));
               }
               break;
            case 73:
               _loc2_._parent.RandomGame.innerOnInvite(_loc3_.substr(2));
               break;
            case 82:
               if(codeErreur)
               {
                  _loc2_._parent.RandomGame.innerOnRefuseInvitation(false,_loc3_.substring(3));
               }
               else
               {
                  _loc2_._parent.RandomGame.innerOnRefuseInvitation(true,_loc3_.substring(2));
               }
               break;
            case 65:
               _loc2_._parent.RandomGame.innerOnAcceptInvitation(_loc3_.substring(2));
               break;
            case 74:
               _loc2_._parent.RandomGame.innerOnjoin(_loc3_.substr(3));
         }
         break;
      case 79:
         switch(codeAction)
         {
            case 70:
               break;
            case 87:
               _loc2_._parent.Items.innerOnWeapon(_loc3_.substr(2));
               break;
            case 68:
               _loc2_._parent.Items.innerOnDrop(codeErreur,_loc3_.substr(3));
               break;
            case 65:
               _loc2_._parent.Items.innerOnAdd(codeErreur,_loc3_.substr(3));
         }
      default:
         return;
   }
   switch(codeAction)
   {
      case 65:
         if(codeErreur)
         {
            _loc2_._parent.Account.innerOnAddFirend(false,_loc3_.substr(3),false);
         }
         else
         {
            _loc2_._parent.Account.innerOnAddFirend(true,_loc3_.substr(3),false);
         }
         break;
      case 68:
         if(codeErreur)
         {
            _loc2_._parent.Account.onRemoveFriend(false,_loc3_.substr(3));
         }
         else
         {
            _loc2_._parent.Account.onRemoveFriend(true);
         }
         break;
      case 76:
         _loc2_._parent.Account.innerOnFirendsList(_loc3_.substr(3));
         break;
      case 108:
         _loc2_._parent.Account.innerOnFirendsListForRandomGame(_loc3_.substr(3));
         break;
      case 73:
         _loc2_._parent.Account.onFirendIn(_loc3_.substr(2));
         break;
      case 79:
         _loc2_._parent.Account.onFirendOut(_loc3_.substr(2));
   }
};
