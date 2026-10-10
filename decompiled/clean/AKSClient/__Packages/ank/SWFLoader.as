class ank.SWFLoader extends MovieClip
{
   var _frameStart;
   function SWFLoader()
   {
      super();
      AsBroadcaster.initialize(this);
      this.initialize(0);
   }
   function initialize(frame)
   {
      this.clear();
      this._frameStart = frame != undefined ? frame : 1;
   }
   function clear()
   {
      this.createEmptyMovieClip("swf_mc",10);
   }
   function loadSWF(file, frame)
   {
      var _loc1_ = this;
      var _loc2_ = false;
      if(file.substring(0,12) == "clips/items/")
      {
         _loc2_ = true;
      }
      _loc1_.initialize(frame);
      _loc1_.swf_mc.onInitFrame = function()
      {
         var _loc1_ = this;
         _loc1_.gotoAndStop(_loc1_._parent._frameStart);
         _loc1_._parent.broadcastMessage("onLoadComplete",_loc1_);
      };
      _loc1_.swf_mc.loadMovie(file);
   }
}
