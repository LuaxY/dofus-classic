on(release){
   this._parent.Tabs.showLayer("TabFriends");
   if(DATACENTER.Game.isMultiplayer && DATACENTER.Game.isPlayerIn)
   {
      AKS.Game.leave();
   }
}
