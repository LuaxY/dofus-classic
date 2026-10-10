this.onFocus = function()
{
   var _loc1_ = this;
   AKS.Game.output = _loc1_;
   AKS.Game.getMapsList();
   AKS.Game.getList(2);
   _loc1_.txtGameName.text = "";
   _loc1_.txtGamePass2.text = "";
   _loc1_.txtGamePass1.text = "";
   _loc1_.comboNumberPlayer.setSelectedIndex(0);
   _loc1_.lstDeltaLevel.setSelectedIndex(0);
   _loc1_.lstTimePerTurn.setSelectedIndex(0);
};
