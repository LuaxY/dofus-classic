Class_Client_Channels = function(parent)
{
   this._parent = parent;
   this.m_lastChannel = null;
};
Object.registerClass("Dofus::Client::Channels",Class_Client_Channels);
Class_Client_Channels.prototype.onJoin = null;
Class_Client_Channels.prototype.onMovement = null;
Class_Client_Channels.prototype.send = function(data)
{
   this._parent.send(data);
};
Class_Client_Channels.prototype.join = function(name)
{
   var _loc1_ = name;
   if(_loc1_ == undefined && DATACENTER.Channel.lastChannel != null)
   {
      this.send("CJ" + DATACENTER.Channel.lastChannel + "\n");
   }
   else
   {
      _loc1_ = _loc1_.replace(["<",">","|"],["_","_","_"]);
      this.send("CJ" + _loc1_ + "\n");
   }
};
Class_Client_Channels.prototype.getList = function()
{
   this.send("CL\n");
};
Class_Client_Channels.prototype.innerOnMovement = function(data)
{
   var movementData = data.split("|");
   var str;
   var _loc3_;
   var _loc2_ = new Object();
   var _loc1_;
   i = 1;
   while(i < movementData.length)
   {
      _loc1_ = movementData[i].split(";");
      if(_loc1_[0].charAt(0) == "+")
      {
         _loc3_ = true;
      }
      else
      {
         _loc3_ = false;
      }
      _loc2_.name = _loc1_[0].substr(1);
      _loc2_.level = _loc1_[1];
      _loc2_.gfxID = _loc1_[2];
      this.onMovement(_loc3_,_loc2_,false);
      i++;
   }
};
Class_Client_Channels.prototype.innerOnList = function(data)
{
   AKS.Chat.output.removeAllUsers();
   var movementData = data.split("|");
   var str;
   var _loc1_;
   var _loc3_;
   var _loc2_ = 1;
   while(_loc2_ < movementData.length)
   {
      _loc1_ = new Object();
      _loc3_ = movementData[_loc2_].split(";");
      _loc1_.name = _loc3_[0];
      _loc1_.level = _loc3_[1];
      _loc1_.gfxID = _loc3_[2];
      this.onMovement(true,_loc1_,true);
      _loc2_ = _loc2_ + 1;
   }
};
