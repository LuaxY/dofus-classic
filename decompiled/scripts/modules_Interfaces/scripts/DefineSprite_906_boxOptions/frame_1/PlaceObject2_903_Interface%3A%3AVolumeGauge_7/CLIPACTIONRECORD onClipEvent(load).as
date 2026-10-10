onClipEvent(load){
   this.setValue(SOMA.getVolumeMusic());
   this.onChange = function(value)
   {
      SOMA.setVolumeMusic(value);
   };
}
