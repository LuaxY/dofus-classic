MovieClip.prototype.end = function(sequencer)
{
   var _loc1_ = sequencer;
   var _loc3_ = this.getActionClip();
   var objObject = this.getObjectClip();
   if(_loc1_ == undefined)
   {
      _loc1_ = _loc3_.data.SEQUENCER_anim;
   }
   var _loc2_ = objObject[_loc1_.unicID];
   _loc1_.onActionEnd(_loc2_);
};
