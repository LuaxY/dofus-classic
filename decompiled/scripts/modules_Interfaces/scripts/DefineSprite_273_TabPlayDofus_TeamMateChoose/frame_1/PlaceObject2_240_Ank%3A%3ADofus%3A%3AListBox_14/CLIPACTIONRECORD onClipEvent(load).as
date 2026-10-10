onClipEvent(load){
   INTERFACE.listBox_sf.addListener(this);
   INTERFACE.listBox_sf.applyChanges();
   this.onDblClick = function()
   {
      var _loc2_ = this.getValue();
      var _loc1_ = this.getSelectedItem().label;
      if(_loc2_ != 0)
      {
         INTERFACE.wisperBox(_loc1_);
      }
   };
}
