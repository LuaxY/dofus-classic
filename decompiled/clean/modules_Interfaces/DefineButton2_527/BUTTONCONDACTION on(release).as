on(release){
   if(DATACENTER.Player.canBoost(1))
   {
      AKS.Account.boost(10);
      this.btn10._visible = false;
   }
}
