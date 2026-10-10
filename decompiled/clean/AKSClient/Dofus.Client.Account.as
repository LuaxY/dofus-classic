Class_Client_Account = function(parent)
{
   this._parent = parent;
   this.isSet = false;
};
Object.registerClass("Dofus::Client::Account",Class_Client_Account);
Class_Client_Account.prototype.onWhoIs = null;
Class_Client_Account.prototype.onWhoAmI = null;
Class_Client_Account.prototype.onGetCharacters = null;
Class_Client_Account.prototype.onSetCharacter = null;
Class_Client_Account.prototype.send = function(data, bWaiting)
{
   this._parent.send(data,bWaiting);
};
Class_Client_Account.prototype.whoAmI = function()
{
   this.send("BW\n");
};
Class_Client_Account.prototype.whoIs = function(name)
{
   this.send("BW" + name + "\n");
};
Class_Client_Account.prototype.getCharacters = function()
{
   this.send("PL\n");
};
Class_Client_Account.prototype.setCharacter = function(charId)
{
   var _loc1_ = this;
   if(!_loc1_.isSet)
   {
      _loc1_.send("PS" + charId + "\n");
      _loc1_.isSet = true;
   }
};
Class_Client_Account.prototype.addCharacter = function(name, guild, color1, color2, color3, sex)
{
   this.send("PA" + name + "|" + guild + "|" + sex + "|" + color1 + "|" + color2 + "|" + color3 + "\n");
};
Class_Client_Account.prototype.deleteCharacter = function(characterID)
{
   var _loc1_ = characterID;
   if(!(_loc1_ == undefined || _loc1_.length == 0))
   {
      this.send("PD" + _loc1_ + "\n");
   }
};
Class_Client_Account.prototype.boost = function(bonusID)
{
   this.send("PB" + bonusID + "\n");
};
Class_Client_Account.prototype.getFriendsList = function()
{
   this.send("FL\n",false);
};
Class_Client_Account.prototype.getFriendsListForRandomGame = function()
{
   this.send("Fl\n",false);
};
Class_Client_Account.prototype.addFriend = function(name)
{
   var _loc1_ = name;
   if(!(_loc1_ == undefined || _loc1_.length == 0 || _loc1_ == "*"))
   {
      this.send("FA" + _loc1_ + "\n");
   }
};
Class_Client_Account.prototype.removeFriend = function(name)
{
   var _loc1_ = name;
   if(!(_loc1_ == undefined || _loc1_.length == 0 || _loc1_ == "*"))
   {
      this.send("FD" + _loc1_ + "\n");
   }
};
Class_Client_Account.prototype.innerOnAddFirend = function(success, friendData, bList)
{
   var _loc2_ = friendData.split(";");
   var _loc1_;
   if(success)
   {
      _loc1_ = new Object();
      _loc1_.account = _loc2_[0];
      if(_loc2_[1] != undefined)
      {
         switch(_loc2_[1])
         {
            case "C":
               _loc1_.state = "IN_CHANNEL";
               break;
            case "1":
               _loc1_.state = "IN_SOLO";
               break;
            case "2":
               _loc1_.state = "IN_MULTI";
               break;
            case "3":
               _loc1_.state = "IN_RANDOM";
               break;
            case "?":
               _loc1_.state = "IN_UNKNOW";
         }
         _loc1_.name = _loc2_[2];
         _loc1_.level = _loc2_[3];
         _loc1_.guild = _loc2_[4];
         _loc1_.sex = _loc2_[5];
         _loc1_.gfxID = _loc2_[6];
      }
      else
      {
         _loc1_.state = "DISCONNECT";
      }
      if(_loc1_.account.length != 0)
      {
         DATACENTER.Player.Friends.push(_loc1_);
      }
   }
   if(!bList)
   {
      this.onAddFriend(success,_loc2_[0]);
   }
};
Class_Client_Account.prototype.innerOnFirendsList = function(friendsData)
{
   var _loc2_ = this;
   DATACENTER.Player.Friends = new Array();
   var _loc1_ = friendsData.split("|");
   i = 0;
   while(i < _loc1_.length)
   {
      _loc2_.innerOnAddFirend(true,_loc1_[i],true);
      i++;
   }
   _loc2_.onFriendslist();
};
Class_Client_Account.prototype.innerOnFirendsListForRandomGame = function(friendsData)
{
   var _loc3_ = friendsData.split("|");
   var fArray = new Array();
   var _loc1_;
   var _loc2_;
   i = 0;
   while(i < _loc3_.length)
   {
      _loc2_ = _loc3_[i].split(";");
      _loc1_ = new Object();
      _loc1_.name = _loc2_[0];
      _loc1_.id = _loc2_[1];
      _loc1_.level = _loc2_[2];
      if(_loc1_.id != undefined)
      {
         fArray.push(_loc1_);
      }
      i++;
   }
   this.onFirendsListForRandomGame(fArray);
};
Class_Client_Account.prototype.innerOnNewLevel = function(levelData)
{
   var _loc2_ = levelData.split("|");
   var _loc1_ = DATACENTER.Player.data;
   _loc1_.level = _loc2_[0];
   _loc1_.XPlow = _loc2_[1];
   _loc1_.XP = _loc2_[2];
   _loc1_.XPhigh = _loc2_[3];
   _loc1_.bonusPoints = _loc2_[4];
   this.onNewLevel(_loc1_.level);
};
Class_Client_Account.prototype.innerOnBoost = function(boostData)
{
   var tmpArray = boostData.split("|");
   var characID = tmpArray[0];
   var _loc2_ = DATACENTER.Characters.getItemAt(characID);
   var id;
   var _loc1_;
   var tmpArray2;
   var _loc3_ = 1;
   while(_loc3_ < tmpArray.length)
   {
      tmpArray2 = tmpArray[_loc3_].split(";");
      id = tmpArray2[0];
      _loc1_ = tmpArray2[1];
      switch(id)
      {
         case "0":
            _loc2_.LPmax = _loc1_;
            _loc2_.LP = _loc1_;
            break;
         case "1":
            _loc2_.APinit = _loc1_;
            _loc2_.AP = _loc1_;
            break;
         case "2":
            _loc2_.GP = _loc1_;
            break;
         case "3":
            _loc2_.bonusPoints = _loc1_;
            break;
         case "6":
            _loc2_.rFire = _loc1_;
            break;
         case "7":
            _loc2_.rAir = _loc1_;
            break;
         case "8":
            _loc2_.rWater = _loc1_;
            break;
         case "9":
            _loc2_.rEarth = _loc1_;
            break;
         case "10":
            _loc2_.force = _loc1_;
            break;
         case "11":
            _loc2_.vitality = _loc1_;
            break;
         case "12":
            _loc2_.charism = _loc1_;
            break;
         case "13":
            _loc2_.karma = _loc1_;
            break;
         case "14":
            _loc2_.agility = _loc1_;
            break;
         case "15":
            _loc2_.intelligence = _loc1_;
      }
      _loc3_ = _loc3_ + 1;
   }
};
