function FComboBoxItemClass()
{
   this.init();
}; //unpopped
FComboBoxItemClass.prototype = new FSelectableItemClass();
Object.registerClass("FComboBoxItemSymbol",FComboBoxItemClass);
FComboBoxItemClass.prototype.setSize = function(w, h)
{
   var _loc1_ = this;
   super.setSize(w,h);
   _loc1_.highlight_mc.onRollOver = function()
   {
      this.controller.controller.selectionHandler(this.controller.itemNum);
   };
};
