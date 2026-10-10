on(release){
   if(DATACENTER.Player.canBoost(1))
   {
      AKS.Account.boost(6);
      this.btn6._visible = false;
   }
}
