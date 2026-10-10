class dofus.graphics.gui.common.ObjectInfosViewer extends MovieClip
{
   var description_txt;
   var name_txt;
   function ObjectInfosViewer()
   {
      super();
      this.initialize();
   }
   function initialize()
   {
      this.view();
   }
   function clear()
   {
      this.name_txt.setText("","Font2");
      this.description_txt.text = "";
   }
   function view(itemData)
   {
      var _loc1_ = itemData;
      var _loc2_ = this;
      _loc1_.name == undefined ? "" : _loc2_.name_txt.setText(_loc1_.name,"Font2");
      _loc2_.description_txt.text = _loc1_.description == undefined ? "" : _loc1_.description;
      if(_loc1_.superType != undefined)
      {
         _loc2_.superTypeIcon_mc._visible = true;
         _loc2_.superTypeIcon_mc.gotoAndStop(_loc1_.superType);
      }
      else
      {
         _loc2_.superTypeIcon_mc._visible = false;
      }
   }
}
