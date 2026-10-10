onClipEvent(load){
   INTERFACE.listBox_sf.addListener(this);
   INTERFACE.listBox_sf.applyChanges();
   this.onDblClick = function()
   {
      INTERFACE.wisperBox(this.getSelectedItem().label);
   };
}
