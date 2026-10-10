onClipEvent(load){
   this.setToolTip(getText("CHAT_TYPE3"));
   this.select(CHAT.bType3);
   this.onClick = function()
   {
      var _loc1_ = !this.bSelected;
      CHAT.setTypes(undefined,undefined,_loc1_,undefined);
      this.select(_loc1_);
   };
   this.setEnabled(true);
}
