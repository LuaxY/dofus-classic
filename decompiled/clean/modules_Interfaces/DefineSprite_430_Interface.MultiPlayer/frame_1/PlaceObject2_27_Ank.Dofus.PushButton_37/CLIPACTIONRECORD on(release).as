on(release){
   if(DATACENTER.Game.isMultiplayer && DATACENTER.Game.isPlayerIn)
   {
      AKS.Game.leave();
   }
   this._parent.Tabs.showLayer("TabStart");
}
