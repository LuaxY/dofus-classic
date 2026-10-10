onClipEvent(load){
   this.setValue(SOMA.getVolumeSound());
   this.onChange = function(value)
   {
      SOMA.setVolumeSound(value);
   };
}
