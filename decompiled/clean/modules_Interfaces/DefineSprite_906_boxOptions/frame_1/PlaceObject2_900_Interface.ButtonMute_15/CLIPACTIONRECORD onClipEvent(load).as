onClipEvent(load){
   this.setEnabled(true);
   this.select(SOMA.getMuteSound());
   this.setToolTip(getText("MUTE_SOUNDS"));
   this.onChange = function(value)
   {
      SOMA.setMuteSound(value);
   };
}
