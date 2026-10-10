on(release){
   if(DATACENTER.Player.canBoost(1))
   {
      AKS.Account.boost(8);
      this.btn8._visible = false;
   }
}
