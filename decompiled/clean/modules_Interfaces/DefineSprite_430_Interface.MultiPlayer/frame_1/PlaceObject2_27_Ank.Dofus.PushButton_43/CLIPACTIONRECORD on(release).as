on(release){
   this._parent.helpLayer._visible = true;
   INTERFACE.setCursor(CLIPS_PATH + "helpicon.swf");
   INTERFACE.cursor.setForbidden(false);
   this._parent.helpLayer.showLayer(this._parent.Tabs.getCurrentLayer());
   this.onMouseUp = function()
   {
      INTERFACE.setCursor(null);
      INTERFACE.hideToolTip();
      this._parent.helpLayer._visible = false;
      Mouse.removeListener(this);
   };
   Mouse.addListener(this);
}
