class dofus.graphics.battlefield.character.SmileyOverHead extends MovieClip
{
   var _character;
   var simley_mc;
   function SmileyOverHead(character)
   {
      super();
      this._character = character;
      this.initialize();
   }
   function initialize()
   {
      this.createEmptyMovieClip("simley_mc",10);
      this.simley_mc.attachMovie("ank::SWFLoader","swfLoader_mc",10);
   }
   function drawSmiley(smileyID)
   {
      var _loc1_ = this;
      _loc1_.simley_mc.swfLoader_mc.loadSWF(dofus.Constants.SMILEY_FILE,smileyID);
      var i = 0;
      _loc1_.onEnterFrame = function()
      {
         var _loc1_ = this;
         if(i >= 100)
         {
            _loc1_.simley_mc._xscale = _loc1_.simley_mc._yscale = 100;
            delete _loc1_.onEnterFrame;
         }
         else
         {
            i += 40;
            _loc1_.simley_mc._xscale = _loc1_.simley_mc._yscale = i;
            if(i >= 100)
            {
               i = 100;
            }
         }
      };
      ank.Timer.setTimer(_loc1_,_loc1_.remove,dofus.Constants.SMILEY_DELAY);
   }
   function remove()
   {
      this.removeMovieClip();
   }
}
