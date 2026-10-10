onClipEvent(load){
   this.setChangeHandler("eventHandler",this);
   this.eventHandler = function(component)
   {
      this._parent.MapImage.loadMapImage(this.getSelectedItem().data);
   };
   this.setSelectedIndex(0);
}
