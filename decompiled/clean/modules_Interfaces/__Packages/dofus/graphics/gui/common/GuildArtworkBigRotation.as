class dofus.graphics.gui.common.GuildArtworkBigRotation extends MovieClip
{
   function GuildArtworkBigRotation()
   {
      super();
      this.initialize();
   }
   function initialize()
   {
      var _loc1_ = this;
      _loc1_._i = 2.02;
      _loc1_._di = 2.015;
      _loc1_._tinit = 90;
      _loc1_.onEnterFrame = function()
      {
         this.rotate(0);
      };
   }
   function rotate(sex)
   {
      var _loc1_ = this;
      var _loc2_ = sex;
      if(_loc1_._currentSex != _loc2_)
      {
         _loc1_._currentSex = _loc2_;
         var piy = 0;
         var px = 0;
         var py = 0;
         var t = 0;
         var bSwaped = false;
         if(_loc2_ == 1)
         {
            _loc1_._di = 5.140000000000001;
            _loc1_.woman_mc.colorize(false);
            _loc1_.man_mc.colorize(true);
         }
         if(_loc2_ == 0)
         {
            _loc1_._di = 2;
            _loc1_.woman_mc.colorize(true);
            _loc1_.man_mc.colorize(false);
         }
         _loc1_.onEnterFrame = function()
         {
            var _loc1_ = this;
            if(Math.abs(_loc1_._i - _loc1_._di) > 0.01)
            {
               _loc1_._i -= (_loc1_._i - _loc1_._di) / 3;
               piy = py;
               px = 70 * Math.cos(_loc1_._i);
               py = 50 * Math.sin(_loc1_._i);
               if(piy < 0 && py >= 0 || piy >= 0 && py < 0)
               {
                  if(!bSwaped)
                  {
                     _loc1_.man_mc.swapDepths(_loc1_.woman_mc);
                     bSwaped = true;
                  }
               }
               t = py / 1.5;
               _loc1_.man_mc._x = px;
               _loc1_.man_mc._y = py;
               _loc1_.man_mc._xscale = _loc1_._tinit + t;
               _loc1_.man_mc._yscale = _loc1_._tinit + t;
               _loc1_.woman_mc._x = - px;
               _loc1_.woman_mc._y = - py;
               _loc1_.woman_mc._xscale = _loc1_._tinit - t;
               _loc1_.woman_mc._yscale = _loc1_._tinit - t;
            }
            else
            {
               delete _loc1_.onEnterFrame;
            }
         };
      }
   }
}
