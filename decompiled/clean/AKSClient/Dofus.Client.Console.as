Class_Client_Console = function(parent)
{
   var _loc1_ = this;
   _loc1_._parent = parent;
   _loc1_.Init();
   _loc1_.consoleHistory = new Array();
   _loc1_.consoleHistoryPointer = 0;
   _loc1_.whisperHistory = new Array();
   _loc1_.whisperHistoryPointer = 0;
};
Object.registerClass("Dofus::Client::Console",Class_Client_Console);
Class_Client_Console.prototype.process = function(cmd)
{
   var _loc1_ = cmd;
   var _loc3_;
   var pos2;
   var _loc2_;
   var str2;
   var int1;
   this.pushHistory(_loc1_);
   if(_loc1_.charCodeAt(0) == 47)
   {
      _loc3_ = _loc1_.indexOf(" ");
      if(_loc3_ == -1)
      {
         _loc3_ = _loc1_.length;
      }
      var command = _loc1_.substring(1,_loc3_).toUpperCase();
      switch(command)
      {
         case "VERSION":
         case "VER":
            KERNEL.traceToChat("DOFUS v" + VERSION,INFO_CHAT_COLOR);
            break;
         case "C":
            AKS.send(_loc1_.substr(3) + "\n");
            break;
         case "COUNT":
            AKS.Infos.getInfos();
            break;
         case "T":
            AKS.Chat.send(_loc1_.substr(3),"#");
            break;
         case "W":
         case "MSG":
         case "WHISPER":
            int1 = command.length + 2;
            _loc3_ = _loc1_.indexOf(" ",int1);
            if(_loc3_ == -1)
            {
               KERNEL.traceToChat(getText("SYNTAX_ERROR",[" /w &lt;" + getText("NAME",[]) + "&gt; &lt;" + getText("MSG",[]) + "&gt;"]),ERROR_CHAT_COLOR);
               break;
            }
            _loc2_ = _loc1_.substring(int1,_loc3_);
            str2 = _loc1_.substring(_loc3_ + 1);
            this.pushWhisper("/w " + _loc2_ + " ");
            AKS.Chat.send(str2,_loc2_);
            break;
         case "J":
         case "JOIN":
            var int1 = command.length + 2;
            this._parent.Channels.join(_loc1_.substring(int1));
            break;
         case "WHOAMI":
            this._parent.Account.whoAmI();
            break;
         case "WHOIS":
            if(_loc1_.length < 8)
            {
               KERNEL.traceToChat(getText("SYNTAX_ERROR",[" /whois &lt;" + getText("NAME",[]) + "&gt;"]),ERROR_CHAT_COLOR);
               break;
            }
            _loc2_ = _loc1_.substring(7);
            this._parent.Account.whoIs(_loc2_);
            break;
         case "F":
         case "FRIEND":
         case "FRIENDS":
            var params = _loc1_.split(" ");
            _loc2_ = String(params[1]).toUpperCase();
            str2 = String(params[2]);
            if(_loc2_.length != 1 || str2.length == 0 && _loc2_ != "L")
            {
               KERNEL.traceToChat(getText("SYNTAX_ERROR",[" /f &lt;A/D/L&gt; &lt;" + getText("NAME",[]) + "&gt;"]),ERROR_CHAT_COLOR);
               break;
            }
            switch(_loc2_)
            {
               case "A":
               case "+":
                  this._parent.Account.addFriend(str2);
                  break;
               case "D":
               case "R":
               case "-":
                  this._parent.Account.removeFriend(str2);
                  break;
               case "L":
                  this._parent.Account.getFriendsList();
                  break;
               default:
                  KERNEL.traceToChat(getText("SYNTAX_ERROR",[" /f &lt;A/D&gt; &lt;" + getText("NAME",[]) + "&gt;"]),ERROR_CHAT_COLOR);
            }
            break;
         default:
            KERNEL.traceToChat(getText("UNKNOW_COMMAND",[command]),ERROR_CHAT_COLOR);
      }
   }
   else
   {
      this._parent.Chat.send(_loc1_,"*");
   }
};
Class_Client_Console.prototype.pushHistory = function(cmd)
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.consoleHistory.slice(-1);
   var _loc3_;
   if(_loc2_[0] != cmd)
   {
      _loc3_ = _loc1_.consoleHistory.push(cmd);
      if(_loc3_ > 50)
      {
         _loc1_.consoleHistory.shift();
      }
   }
   _loc1_.consoleHistoryPointer = _loc1_.consoleHistory.length;
};
Class_Client_Console.prototype.getHistoryUp = function()
{
   var _loc1_ = this;
   if(_loc1_.consoleHistoryPointer > 0)
   {
      _loc1_.consoleHistoryPointer = _loc1_.consoleHistoryPointer - 1;
   }
   var _loc2_ = _loc1_.consoleHistory[_loc1_.consoleHistoryPointer];
   return _loc2_;
};
Class_Client_Console.prototype.getHistoryDown = function()
{
   var _loc1_ = this;
   if(_loc1_.consoleHistoryPointer < _loc1_.consoleHistory.length)
   {
      _loc1_.consoleHistoryPointer = _loc1_.consoleHistoryPointer + 1;
   }
   var _loc2_ = _loc1_.consoleHistory[_loc1_.consoleHistoryPointer];
   return _loc2_;
};
Class_Client_Console.prototype.pushWhisper = function(cmd)
{
   var _loc1_ = this;
   var _loc3_ = _loc1_.whisperHistory.slice(-1);
   var _loc2_;
   if(_loc3_[0] != cmd)
   {
      _loc2_ = _loc1_.whisperHistory.push(cmd);
      if(_loc2_ > 50)
      {
         _loc1_.whisperHistory.shift();
      }
   }
   _loc1_.whisperHistoryPointer = _loc1_.whisperHistory.length;
};
Class_Client_Console.prototype.getWhisperHistoryUp = function()
{
   var _loc1_ = this;
   if(_loc1_.whisperHistoryPointer > 0)
   {
      _loc1_.whisperHistoryPointer = _loc1_.whisperHistoryPointer - 1;
   }
   var _loc2_ = _loc1_.whisperHistory[_loc1_.whisperHistoryPointer];
   return _loc2_;
};
Class_Client_Console.prototype.getWhisperHistoryDown = function()
{
   var _loc1_ = this;
   if(_loc1_.whisperHistoryPointer < _loc1_.whisperHistory.length)
   {
      _loc1_.whisperHistoryPointer = _loc1_.whisperHistoryPointer + 1;
   }
   var _loc2_ = _loc1_.whisperHistory[_loc1_.whisperHistoryPointer];
   return _loc2_;
};
