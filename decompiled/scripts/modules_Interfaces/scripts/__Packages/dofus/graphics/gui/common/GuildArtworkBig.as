class dofus.graphics.gui.common.GuildArtworkBig extends MovieClip
{
   var _lastTransform;
   var onEnterFrame;
   static var RED = [0,10,19,29,38];
   static var GREEN = [0,37,74,112,149];
   static var BLUE = [0,53,106,160,213];
   static var PERCENT = [100,75,50,25,0];
   function GuildArtworkBig()
   {
      super();
      this.initialize();
   }
   function initialize()
   {
      this.createEmptyMovieClip("big_mc",10);
   }
   function show(guildID, sexID)
   {
      var _loc1_ = this;
      var _loc3_ = guildID;
      _loc3_ = String(_loc3_) + String(sexID);
      _loc1_.createEmptyMovieClip("big_mc",10);
      _loc1_.big_mc.loadMovie(dofus.Constants.GUILDS_BIG_PATH + _loc3_ + ".swf");
      var _loc2_;
      if(_loc1_._lastTransform != undefined)
      {
         _loc2_ = new Color(_loc1_.big_mc);
         _loc2_.setTransform(_loc1_._lastTransform);
      }
   }
   function colorize(bToBlue)
   {
      var _loc1_ = this;
      var len = dofus.graphics.gui.common.GuildArtworkBig.RED.length;
      var i = !bToBlue ? len - 1 : 0;
      var inc = !bToBlue ? -1 : 1;
      var c = new Color(_loc1_.big_mc);
      var t = new Object();
      _loc1_.onEnterFrame = function()
      {
         t.ra = dofus.graphics.gui.common.GuildArtworkBig.PERCENT[i];
         t.rb = dofus.graphics.gui.common.GuildArtworkBig.RED[i];
         t.ga = dofus.graphics.gui.common.GuildArtworkBig.PERCENT[i];
         t.gb = dofus.graphics.gui.common.GuildArtworkBig.GREEN[i];
         t.ba = dofus.graphics.gui.common.GuildArtworkBig.PERCENT[i];
         t.bb = dofus.graphics.gui.common.GuildArtworkBig.BLUE[i];
         c.setTransform(t);
         i += inc;
         if(i >= len || i < 0)
         {
            this._lastTransform = t;
            delete this.onEnterFrame;
         }
      };
   }
}
