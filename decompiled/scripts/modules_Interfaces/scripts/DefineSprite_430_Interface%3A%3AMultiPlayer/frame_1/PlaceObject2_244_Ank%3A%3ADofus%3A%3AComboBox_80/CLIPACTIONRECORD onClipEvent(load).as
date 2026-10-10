onClipEvent(load){
   this.enabledEvent = true;
   this.setChangeHandler("eventHandler",this);
   this.eventHandler = function(component)
   {
      if(this.enabledEvent)
      {
         AKS.Channels.join(this.getValue());
      }
   };
   this.setSelectedIndex(0);
}
