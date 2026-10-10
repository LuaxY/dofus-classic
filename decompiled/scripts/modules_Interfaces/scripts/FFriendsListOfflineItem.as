function FFriendsListOfflineItemClass()
{
   this.init();
}; //unpopped
FFriendsListOfflineItemClass.prototype = new FSelectableItemClass();
Object.registerClass("FFriendsListOfflineItem",FFriendsListOfflineItemClass);
FFriendsListOfflineItemClass.prototype.layoutContent = function(width)
{
   super.layoutContent(width);
   this.txtAccount.text = "";
   this.btnRemove._visible = false;
};
FFriendsListOfflineItemClass.prototype.displayContent = function(itmObj, selected)
{
   var _loc1_ = this;
   var _loc2_ = itmObj;
   var _loc3_ = "";
   _loc1_.txtAccount.text = "";
   _loc1_.btnRemove._visible = false;
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
      _loc1_.txtAccount.setText(_loc2_.account,"Font3");
      _loc1_.friendAccount = _loc2_.account;
   }
};
