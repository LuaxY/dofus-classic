this.onFocus = function()
{
   AKS.Game.output = this;
   this.selfStats.onSetXP(DATACENTER.Player.data.XP);
   AKS.Infos.getGeneral();
};
this.onFocusFinal = function()
{
   this.newsScroller.loadXHML(HTTP_NEWS_FILE);
   AKS.Infos.getPodium();
};
this.onLostFocus = function()
{
   this.podium.clear();
   this.newsScroller.clear();
};
