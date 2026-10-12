LoadingClass = function()
{
   if(ROOT.swfLoad == undefined)
   {
      ROOT.swfLoad = new Array();
   }
   this._visible = false;
};
LoadingClass.prototype = new MovieClip();
Object.registerClass("LoadingSymbol",LoadingClass);
LoadingClass.prototype.setLoadingTarget = function(target, url)
{
   for(var a in ROOT.swfLoad)
   {
      if(ROOT.swfLoad[a] == url)
      {
         var swfExist = true;
      }
   }
   if(swfExist != true)
   {
      this._visible = true;
   }
   this.target = target;
   this.target.stop();
   this.onEnterFrame = function()
   {
      var BT = this.target.getBytesTotal();
      var BL = this.target.getBytesLoaded();
      if(BL == BT && BT > 4)
      {
         this.anim.stop();
         this.ratio = "100 %";
         this.size = BL + " / " + BT;
         this.barre._xscale = 100;
         this.onLoadingEnd();
         ROOT.swfLoad.push(url);
         delete this.onEnterFrame;
         this.removeMovieClip();
      }
      else
      {
         if(BT != 0)
         {
            var ratio = Math.ceil(BL * 100 / BT);
         }
         else
         {
            var ratio = 0;
         }
         this.size = Math.ceil(BL / 1000) + " / " + Math.ceil(BT / 1000) + " Ko";
         this.ratio = ratio + " %";
         this.barre._xscale = ratio;
      }
   };
};
stop();
