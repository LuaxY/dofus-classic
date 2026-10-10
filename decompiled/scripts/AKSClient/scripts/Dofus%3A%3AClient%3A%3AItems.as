Class_Client_Items = function(parent)
{
   this._parent = parent;
};
Object.registerClass("Dofus::Client::Items",Class_Client_Items);
Class_Client_Items.prototype.send = function(data, waiting)
{
   this._parent.send(data,waiting);
};
Class_Client_Items.prototype.movement = function(ID, position)
{
   this.send("OM" + ID + "|" + position + "\n",false);
};
Class_Client_Items.prototype.drop = function(ID)
{
   this.send("OD" + ID + "\n",false);
};
Class_Client_Items.prototype.innerOnWeapon = function(data)
{
   var _loc1_ = data.split("|");
   var _loc2_ = _loc1_[0];
   var _loc3_ = parseInt(_loc1_[1],16);
   var gfx = parseInt(_loc1_[2],16);
   var col = _loc1_[3];
   this.onWeapon(_loc2_,_loc3_,gfx,col);
};
Class_Client_Items.prototype.innerOnAdd = function(bError, data)
{
   var _loc3_;
   var _loc1_;
   var _loc2_;
   if(bError)
   {
      switch(data)
      {
         case "F":
            this.onInventoryFull();
            break;
         case "L":
            this.onTooLowLevel();
      }
   }
   else
   {
      var tmpArray = data.split("*");
      var type;
      var value;
      i = 0;
      while(i < tmpArray.length)
      {
         _loc3_ = tmpArray[i];
         type = _loc3_.substring(0,1);
         dataStr = _loc3_.substr(1);
         switch(type)
         {
            case "G":
               INTERFACE.msgBox(getText("YOU_FIND_GOLD",[dataStr]));
               break;
            case "O":
               _loc2_ = dataStr.split(";");
               var i;
               var i = 0;
               while(i < _loc2_.length)
               {
                  _loc1_ = KERNEL.CharactersManager.getItemObjectFromData(_loc2_[i]);
                  if(_loc1_ != undefined)
                  {
                     DATACENTER.Player.addItem(_loc1_);
                     INTERFACE.msgBox(getText("YOU_FIND_NEW_ITEM") + " : " + _loc1_.name);
                  }
                  i++;
               }
               break;
            default:
               INTERFACE.msgBox(getText("YOU_FIND_SOMTHING"));
         }
         i++;
      }
   }
};
Class_Client_Items.prototype.innerOnDrop = function(bError, data)
{
   this.onDrop(bError,data);
};
