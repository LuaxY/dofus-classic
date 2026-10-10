playAlone_btn.setLabel(getText("PLAY_DUEL"));
makeTeam_btn.setLabel(getText("MAKE_TEAM"));
this.onFocus = function()
{
   AKS.Game.output = this;
   AKS.Account.getFriendsListForRandomGame();
   this.maskSearch._visible = false;
};
this.onFriendsList = function(fArray)
{
   this.teamMateChoose.update(fArray);
};
