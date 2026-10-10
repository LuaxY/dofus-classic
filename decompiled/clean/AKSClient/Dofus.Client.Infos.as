Class_Client_Infos = function(parent)
{
   this._parent = parent;
};
Object.registerClass("Dofus::Client::infos",Class_Client_Infos);
Class_Client_Infos.prototype.onPlayerCout = null;
Class_Client_Infos.prototype.send = function(data, bWaiting)
{
   this._parent.send(data,bWaiting);
};
Class_Client_Infos.prototype.getInfos = function()
{
   this.send("IC\n");
};
Class_Client_Infos.prototype.getPodium = function()
{
   this.send("IP\n");
};
Class_Client_Infos.prototype.getGeneral = function()
{
   this.send("IG\n");
};
Class_Client_Infos.prototype.innerOnPlayerCount = function(data)
{
   this.onPlayerCount(data);
};
Class_Client_Infos.prototype.innerOnPodium = function(data)
{
   var players = data.split("|");
   var len = players.length;
   var _loc2_;
   var _loc1_;
   var playersObject = new Array();
   var _loc3_;
   _loc3_ = 0;
   while(_loc3_ < len)
   {
      _loc2_ = players[_loc3_].split(";");
      _loc1_ = new Object();
      _loc1_.account = _loc2_[0];
      _loc1_.name = _loc2_[1];
      _loc1_.guild = _loc2_[2];
      _loc1_.sex = _loc2_[3];
      _loc1_.gfxID = _loc2_[4];
      _loc1_.color1 = _loc2_[5];
      _loc1_.color2 = _loc2_[6];
      _loc1_.color3 = _loc2_[7];
      _loc1_.xp = _loc2_[8];
      _loc1_.level = _loc2_[9];
      _loc1_.file = CLIPS_PERSOS_PATH + _loc2_[4] + ".swf";
      playersObject.push(_loc1_);
      _loc3_ = _loc3_ + 1;
   }
   this.onPodium(playersObject);
};
Class_Client_Infos.prototype.innerOnGeneral = function(data)
{
   var _loc1_ = data.split("|");
   var _loc3_ = _loc1_[0];
   var _loc2_ = _loc1_[1];
   var gameCountFree = _loc1_[2];
   var gameCountRandom = _loc1_[3];
   var waitingCount = _loc1_[4];
   this.onGeneral(_loc3_,_loc2_,gameCountFree,gameCountRandom,waitingCount);
};
