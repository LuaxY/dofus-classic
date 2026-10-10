function FFriendsListItemClass()
{
   this.init();
}; //unpopped
FFriendsListItemClass.prototype = new FSelectableItemClass();
Object.registerClass("FFriendsListItemSymbol",FFriendsListItemClass);
FFriendsListItemClass.prototype.layoutContent = function(width)
{
   var _loc1_ = this;
   super.layoutContent(width);
   _loc1_.txtAccount.text = "";
   _loc1_.txtLevel.text = "";
   _loc1_.btnRemove._visible = false;
   _loc1_.mini.removeMovieClip();
};
FFriendsListItemClass.prototype.displayContent = function(itmObj, selected)
{
   var _loc1_ = this;
   var _loc2_ = itmObj;
   var _loc3_ = "";
   _loc1_.txtAccount.text = "";
   _loc1_.txtLevel.text = "";
   _loc1_.btnRemove._visible = false;
   _loc1_.mini.removeMovieClip();
   if(_loc2_.label != undefined)
   {
      _loc3_ = _loc2_.label;
      if(_loc1_.fLabel_mc.labelField.text != _loc3_)
      {
         _loc1_.fLabel_mc.setLabel(_loc3_);
      }
   }
   else if(_loc2_.account != undefined)
   {
      _loc1_.btnRemove._visible = true;
      _loc1_.txtAccount.setText(_loc2_.account + " (" + _loc2_.name + ")","Font3");
      _loc1_.friendAccount = _loc2_.account;
      if(_loc2_.guild != undefined)
      {
         var m = _loc1_.attachMovie("Interface::GuildsArtworkMini","mini",10,{guildID:_loc2_.gfxID});
         m._x = 20;
      }
      _loc1_.txtLevel.setText(_loc2_.level,"Font3");
      if(_loc2_.state != undefined)
      {
         var p = _loc1_.attachMovie("pic_" + _loc2_.state,"picto",20);
         p._x = 332;
      }
      else
      {
         _loc1_.picto.removeMovieClip();
      }
   }
   else
   {
      _loc1_.picto.removeMovieClip();
      _loc1_.mini.removeMovieClip();
   }
};
