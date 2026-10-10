onClipEvent(load){
   this.setToolTip(getText("CHAT_TYPE2"));
   this.select(CHAT.bType2);
   this.onClick = function()
   {
      var _loc1_ = !this.bSelected;
      CHAT.setTypes(undefined,_loc1_,undefined,undefined);
      this.select(_loc1_);
   };
   this.setEnabled(true);
}
