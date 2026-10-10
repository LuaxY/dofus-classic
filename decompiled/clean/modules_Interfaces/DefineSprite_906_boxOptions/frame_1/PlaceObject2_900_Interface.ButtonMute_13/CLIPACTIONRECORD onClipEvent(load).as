onClipEvent(load){
   this.setEnabled(true);
   this.select(SOMA.getMuteMusic());
   this.setToolTip(getText("MUTE_MUSIC"));
   this.onChange = function(value)
   {
      SOMA.setMuteMusic(value);
   };
}
