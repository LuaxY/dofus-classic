on(release){
   if(DATACENTER.Game.m_playerCount == 4)
   {
      return undefined;
   }
   var p = this._parent;
   var friend = p.lstFriends.getSelectedItem();
   if(friend != undefined)
   {
      if(DATACENTER.Game.isRandom)
      {
         p._parent.onNewCharacter(friend.label,friend.data,true);
         AKS.Account.getFriendsListForRandomGame();
      }
      else
      {
         this._parent._parent._parent.showLayer("TabPlayDofus");
         AKS.Game.output.onNewCharacter(friend.label,friend.data,true);
      }
   }
}
