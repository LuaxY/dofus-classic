onClipEvent(load){
   this.setToolTip(getText("CHAT_TYPE4"));
   this.select(CHAT.bType4);
   this.onClick = function()
   {
      var _loc1_ = !this.bSelected;
      CHAT.setTypes(undefined,undefined,undefined,_loc1_);
      this.select(_loc1_);
   };
   this.setEnabled(true);
}
