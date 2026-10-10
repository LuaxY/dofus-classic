on(release){
   this._parent.Tabs.showLayer("TabJoinGame");
   if(DATACENTER.Game.isRandom && DATACENTER.Game.isPlayerIn)
   {
      AKS.Game.leave();
   }
}
