Class_Chat = function()
{
   var _loc1_ = this;
   _loc1_.TYPE_MESSAGES = 1;
   _loc1_.TYPE_WISP = 2;
   _loc1_.TYPE_INFOS = 3;
   _loc1_.TYPE_ERRORS = 4;
   _loc1_.init();
};
Object.registerClass("Dofus::Chat",Class_Chat);
Class_Chat.prototype.init = function()
{
   this.clear();
   this.setTypes(true,true,true,true);
};
Class_Chat.prototype.clear = function()
{
   var _loc1_ = this;
   _loc1_.All = new Array();
   _loc1_.Type1 = new Array();
   _loc1_.Type2 = new Array();
   _loc1_.Type3 = new Array();
   _loc1_.Type4 = new Array();
};
Class_Chat.prototype.setTypes = function(bType1, bType2, bType3, bType4)
{
   var _loc1_ = this;
   if(bType1 != undefined)
   {
      _loc1_.bType1 = bType1;
   }
   if(bType2 != undefined)
   {
      _loc1_.bType2 = bType2;
   }
   if(bType3 != undefined)
   {
      _loc1_.bType3 = bType3;
   }
   if(bType4 != undefined)
   {
      _loc1_.bType4 = bType4;
   }
   _loc1_.refresh();
};
Class_Chat.prototype.addText = function(text, col)
{
   var _loc1_ = this;
   var index;
   var type;
   var arrayType;
   switch(col)
   {
      case MSG_CHAT_COLOR:
         type = _loc1_.TYPE_MESSAGES;
         break;
      case MSGCHUCHOTE_CHAT_COLOR:
         type = _loc1_.TYPE_WISP;
         SOMA.onChatWisper();
         break;
      case INFO_CHAT_COLOR:
         type = _loc1_.TYPE_INFOS;
         break;
      case ERROR_CHAT_COLOR:
         type = _loc1_.TYPE_ERRORS;
         SOMA.onError();
         break;
      default:
         trace("Erreur : mauvaise couleur " + text);
         return;
   }
   arrayType = _loc1_["Type" + type];
   index = arrayType.push(text);
   _loc1_.All.push({arrayType:arrayType,type:type,index:index - 1,col:col});
   _loc1_.refresh();
};
Class_Chat.prototype.refresh = function()
{
   var _loc2_;
   var len = this.All.length;
   var _loc3_ = new String();
   var _loc1_;
   var out = AKS.Chat.output.txtChat;
   var count = 0;
   _loc2_ = len - 1;
   while(count < 30 && _loc2_ >= 0)
   {
      _loc1_ = this.All[_loc2_];
      if(this["bType" + _loc1_.type])
      {
         count++;
         _loc3_ = "<br><font color=\'#" + _loc1_.col + "\'>" + _loc1_.arrayType[_loc1_.index] + "</font>" + _loc3_;
      }
      _loc2_ = _loc2_ - 1;
   }
   if(count < 15)
   {
      out.initChat();
      out.htmlText += _loc3_;
   }
   else
   {
      out.htmlText = _loc3_;
   }
   var maxscroll = out.maxscroll;
   if(Math.abs(out.maxscroll - out.scroll) < 4)
   {
      out.scroll = out.maxscroll;
   }
};
