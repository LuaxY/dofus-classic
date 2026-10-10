on(release){
   if(DATACENTER.Game.isMultiplayer && DATACENTER.Game.isPlayerIn)
   {
      AKS.Game.leave();
   }
   AKS.Game.createSolo();
}
