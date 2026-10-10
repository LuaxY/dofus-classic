class dofus.graphics.gui.common.SmileyBar extends MovieClip
{
   var _index;
   var _opened;
   var simleys_mc;
   static var SMILEY_COUNT = 9;
   static var SMILEY_SPACE = 25;
   function SmileyBar()
   {
      super();
      this.initialize();
   }
   function initialize()
   {
      this.createEmptyMovieClip("simleys_mc",10);
      this.close();
      var _loc2_;
      var _loc3_;
      _loc2_ = 1;
      while(_loc2_ < dofus.graphics.gui.common.SmileyBar.SMILEY_COUNT)
      {
         _loc3_ = this.simleys_mc.attachMovie("ank::SWFLoader","smiley" + _loc2_,10 * _loc2_);
         _loc3_.loadSWF(dofus.Constants.SMILEY_FILE,_loc2_);
         _loc3_._x = dofus.graphics.gui.common.SmileyBar.SMILEY_SPACE * _loc2_;
         _loc3_._index = _loc2_;
         _loc3_.onRollOver = function()
         {
            var _loc2_ = new Color(this);
            var _loc1_ = new Object();
            _loc1_.ra = 100;
            _loc1_.rb = 50;
            _loc1_.ga = 100;
            _loc1_.gb = 50;
            _loc1_.ba = 100;
            _loc1_.bb = 50;
            _loc2_.setTransform(_loc1_);
         };
         _loc3_.onRollOut = _loc3_.onReleaseOutside = function()
         {
            var _loc2_ = new Color(this);
            var _loc1_ = new Object();
            _loc1_.ra = 100;
            _loc1_.rb = 0;
            _loc1_.ga = 100;
            _loc1_.gb = 0;
            _loc1_.ba = 100;
            _loc1_.bb = 0;
            _loc2_.setTransform(_loc1_);
         };
         _loc3_.onRelease = function()
         {
            _global.AKS.Chat.smiley(this._index);
         };
         _loc2_ = _loc2_ + 1;
      }
   }
   function openClose()
   {
      var _loc1_ = this;
      if(_loc1_._opened)
      {
         _loc1_.close();
      }
      else
      {
         _loc1_.open();
      }
   }
   function open(Void)
   {
      this._opened = true;
      this.simleys_mc._visible = true;
   }
   function close(Void)
   {
      this._opened = false;
      this.simleys_mc._visible = false;
   }
}
