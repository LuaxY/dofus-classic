on(release){
   if(this._parent.name_txt.text.length != 0)
   {
      AKS.Account.addFriend(this._parent.name_txt.text);
      AKS.Account.getFriendsList();
   }
   this._parent.name_txt.text = "";
}
