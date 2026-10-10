onClipEvent(load){
   this._visible = false;
   this.txtTitleJoin.setText(getText("JOIN_GAME"),"Font2",16777215,13);
   this.txtTitleCreate.setText(getText("CREATE_GAME"),"Font2",16777215,13);
   this.txtGameName1.setText(getText("GAME_NAME"),"Font1");
   this.txtGameName2.setText(getText("GAME_NAME"),"Font1");
   this.txtPassword1.setText(getText("PASSWORD"),"Font1");
   this.txtPassword2.setText(getText("PASSWORD"),"Font1");
   this.txtPlayerCount.setText(getText("PLAYER_COUNT"),"Font1");
   this.txtCard.setText(getText("CARD"),"Font1");
   this.txtDeltaLevel.setText(getText("DELTA_LEVEL"),"Font1");
   this.txtTurnDelay.setText(getText("TURN_DELAY"),"Font1");
   this.btnCreate.setLabel(getText("CREATE_SMALL"));
   this.btnJoin.setLabel(getText("JOIN_SMALL"));
}
