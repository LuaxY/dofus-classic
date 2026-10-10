function FListItemClass()
{
   this.init();
}; //unpopped
FListItemClass.prototype = new FSelectableItemClass();
Object.registerClass("FListItemSymbol",FListItemClass);
