onClipEvent(load){
   INTERFACE.listBox_sf.addListener(this);
   INTERFACE.listBox_sf.applyChanges();
   this.onDblClick = function()
   {
      var _loc1_ = this.getValue();
      if(_loc1_ != DATACENTER.Player.name)
      {
         INTERFACE.wisperBox(_loc1_);
      }
   };
}
