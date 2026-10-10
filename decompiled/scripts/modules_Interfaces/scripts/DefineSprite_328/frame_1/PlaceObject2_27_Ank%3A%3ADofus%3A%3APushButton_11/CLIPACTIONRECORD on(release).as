on(release){
   if(this._parent.txtAccountImput.text.length != 0)
   {
      AKS.Account.addFriend("*" + this._parent.txtAccountImput.text);
      AKS.Account.getFriendsList();
   }
   this._parent.txtAccountImput.text = "";
}
