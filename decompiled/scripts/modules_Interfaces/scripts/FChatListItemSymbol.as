function FChatListItemClass()
{
   this.init();
}; //unpopped
FChatListItemClass.prototype = new FSelectableItemClass();
Object.registerClass("FChatListItemSymbol",FChatListItemClass);
FChatListItemClass.prototype.layoutContent = function(width)
{
   super.layoutContent(width);
   this.txtAccount.text = "";
   this.mini.removeMovieClip();
};
FChatListItemClass.prototype.displayContent = function(itmObj, selected)
{
   var _loc1_ = itmObj;
   var _loc2_ = this;
   var _loc3_ = "";
   _loc2_.txtAccount.text = "";
   _loc2_.mini.removeMovieClip();
   if(_loc1_.label != undefined)
   {
      _loc3_ = _loc1_.label;
      if(_loc2_.fLabel_mc.labelField.text != _loc3_)
      {
         _loc2_.fLabel_mc.setLabel(_loc3_);
      }
   }
   else if(_loc1_.name != undefined)
   {
      _loc2_.txtAccount.setText(_loc1_.name + " (" + _loc1_.level + ")","Font3");
      if(_loc1_.gfxID != undefined)
      {
         var m = _loc2_.attachMovie("Interface::GuildsArtworkMini","mini",10,{guildID:_loc1_.gfxID});
         m._x = 0;
      }
   }
   else
   {
      _loc2_.mini.removeMovieClip();
   }
};
