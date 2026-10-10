Class_TabStart_GlobalStats = function()
{
   this.init();
};
Class_TabStart_GlobalStats.prototype = new MovieClip();
Object.registerClass("TabStart_GlobalStats",Class_TabStart_GlobalStats);
Class_TabStart_GlobalStats.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.txtTitle.setText(getText("DOFUS_STATS"),"Font1");
   _loc1_.txtPlayerCount.setText(getText("CONNECTED") + " :","Font1");
   _loc1_.txtGameCount.setText(getText("GAMECOUNT") + " :","Font1");
   _loc1_.txtInVillage.setText(getText("INVILLAGECOUNT") + " :","Font1");
};
Class_TabStart_GlobalStats.prototype.setValues = function(playerCount, gameCountSolo, gameCountFree, gameCountRandom, waitingCount)
{
   var _loc1_ = this;
   _loc1_.txtPlayerCountValue.setText(playerCount,"Font1");
   _loc1_.txtInVillageValue.setText(gameCountSolo,"Font1");
   _loc1_.txtGameCountValue.setText(Number(gameCountFree) + Number(gameCountRandom),"Font1");
};
