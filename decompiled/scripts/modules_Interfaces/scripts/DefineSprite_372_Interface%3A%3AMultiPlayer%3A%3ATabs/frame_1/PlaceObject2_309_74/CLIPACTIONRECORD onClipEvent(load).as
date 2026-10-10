onClipEvent(load){
   this._visible = false;
   this.txtGameNameTitle.setText(getText("GAME_NAME"),"Font1");
   this.txtPlayerCount.setText(getText("PLAYER_COUNT"),"Font1");
   this.txtPassword.setText(getText("PASSWORD"),"Font1");
   this.txtCard.setText(getText("CARD"),"Font1");
   this.txtDeltaLevel.setText(getText("DELTA_LEVEL"),"Font1");
   this.txtTurnDelay.setText(getText("TURN_DELAY"),"Font1");
   this.btnPlay.setLabel(getText("PLAY_SMALL"));
   this.btnCancel.setLabel(getText("CANCEL_SMALL"));
}
