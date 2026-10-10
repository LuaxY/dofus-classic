AKS.Items.onInventoryFull = function()
{
   INTERFACE.msgBox(getText("INVENTORY_FULL"));
};
AKS.Items.onTooLowLevel = function()
{
   INTERFACE.msgBox(getText("TOO_LOW_LEVEL_FOR_ITEM"));
};
AKS.Items.onWeapon = function(characID, weaponType, gfx, col)
{
   var _loc1_ = DATACENTER.Characters.getItemAt(characID);
   _loc1_.weapon.gfx = weaponType + "_" + gfx;
};
AKS.Items.onDrop = function(error, data)
{
   if(error)
   {
      INTERFACE.msgBox(getText("DROP_FULL"));
   }
   else
   {
      DATACENTER.Player.dropItem(Number(data));
   }
};
