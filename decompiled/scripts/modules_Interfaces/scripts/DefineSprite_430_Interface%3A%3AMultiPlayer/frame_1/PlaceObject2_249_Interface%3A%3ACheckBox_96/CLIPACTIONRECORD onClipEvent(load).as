onClipEvent(load){
   this.setToolTip(getText("CHAT_TYPE1"));
   this.select(CHAT.bType1);
   this.onClick = function()
   {
      var _loc1_ = !this.bSelected;
      CHAT.setTypes(_loc1_,undefined,undefined,undefined);
      this.select(_loc1_);
   };
   this.setEnabled(true);
}
