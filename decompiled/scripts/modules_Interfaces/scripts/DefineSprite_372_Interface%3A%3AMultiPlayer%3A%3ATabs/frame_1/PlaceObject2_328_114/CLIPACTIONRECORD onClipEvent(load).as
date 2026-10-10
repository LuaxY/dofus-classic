onClipEvent(load){
   this._visible = false;
   this.txtAddFriend.setText(getText("ADD_A_FRIEND"),"Font2");
   this.txtOnline.setText(getText("ONLINE"),"Font2");
   this.txtOffline.setText(getText("OFFLINE"),"Font2");
   this.txtCharacter.setText(getText("CHARACTER"),"Font1");
   this.txtAccount.setText(getText("ACCOUNT"),"Font1");
   this.txtAccountCharacter.setText(getText("ACCOUNT") + " (" + getText("CHARACTER") + ")","Font1");
   this.txtAccount2.setText(getText("ACCOUNT"),"Font1");
   this.txtLevel.setText(getText("LEVEL"),"Font1");
   this.btnAddCharacter.setLabel(getText("ADD"));
   this.btnAddAccount.setLabel(getText("ADD"));
}
