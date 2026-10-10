Class_boxWhisper = function()
{
   this.init();
};
Class_boxWhisper.prototype = new MovieClip();
Object.registerClass("boxWhisper",Class_boxWhisper);
Class_boxWhisper.prototype.init = function()
{
   var _loc1_ = this;
   Selection.setFocus(_loc1_.txtZone);
   KERNEL.KeyListener.setEnabled(false);
   _loc1_.onKeyDown = function()
   {
      var _loc1_ = this;
      if(Key.isDown(13))
      {
         if(_loc1_.txtZone.text.length != 0)
         {
            AKS.Chat.send(_loc1_.txtZone.text,_loc1_.params.to);
         }
         else
         {
            Selection.setFocus(_loc1_.txtZone);
         }
         _loc1_.owner.hide();
      }
   };
   Key.addListener(_loc1_);
};
