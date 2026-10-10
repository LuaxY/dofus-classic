onClipEvent(load){
   this._visible = false;
   this.txtTitle.setText(getText("TITLE_RANDOM"),"Font2");
   this.txtDescription.htmlText = getText("DESCRIPTION_RANDOM");
}
