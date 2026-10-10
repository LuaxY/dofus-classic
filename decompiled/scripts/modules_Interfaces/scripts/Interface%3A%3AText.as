Class_InterfaceText = function()
{
};
Class_InterfaceText.prototype = new MovieClip();
Object.registerClass("Interface::Text",Class_InterfaceText);
Class_InterfaceText.prototype.setText = function(text, bFader, bBackground)
{
   var _loc2_ = this;
   if(bFader == undefined)
   {
      bFader = true;
   }
   var _loc3_ = Stage.width;
   var h = 432;
   var _loc1_;
   if(text != undefined)
   {
      if(bBackground)
      {
         _loc2_.createEmptyMovieClip("back",1);
         _loc1_ = _loc2_.back;
         _loc1_.beginFill(0,40);
         _loc1_.moveTo(0,0);
         _loc1_.lineTo(_loc3_,0);
         _loc1_.lineTo(_loc3_,60);
         _loc1_.lineTo(0,60);
         _loc1_.endFill();
         _loc1_._y = h / 2 - 30;
      }
      _loc2_.createEmptyMovieClip("txtZone",2);
      var z = _loc2_.txtZone;
      if(bFader)
      {
         z._alpha = 0;
      }
      z.attachMovie("Interface::Text::Clip","sh1",1,{_x:-1,_y:-1,text:text,color:2236962});
      z.attachMovie("Interface::Text::Clip","sh2",2,{_x:-1,_y:1,text:text,color:2236962});
      z.attachMovie("Interface::Text::Clip","sh3",3,{_x:1,_y:-1,text:text,color:2236962});
      z.attachMovie("Interface::Text::Clip","sh4",4,{_x:1,_y:1,text:text,color:2236962});
      z.attachMovie("Interface::Text::Clip","txt",5,{text:text,color:16777215});
      z._x = _loc3_ / 2;
      z._y = (h - _loc2_.txtZone._height) / 2;
   }
   if(bFader)
   {
      var i = 1;
      var i2 = i * i;
      var bEnd = false;
      z._alpha = 0;
      _loc2_.onEnterFrame = function()
      {
         if(bEnd)
         {
            delete this.onEnterFrame;
         }
         else
         {
            i += 2;
            i2 = i * i;
         }
         z._xscale = z._yscale = 200 - i2;
         z._alpha = i2;
         z._y = (h - z._height) / 2;
         if(i2 >= 100)
         {
            i2 = 100;
            bEnd = true;
         }
      };
   }
};
Class_InterfaceText.prototype.setTextTimer = function(text, interval, bFader, bBackground)
{
   var _loc1_ = this;
   _loc1_.setText(text,bFader,bBackground);
   clearInterval(_loc1_.intervalID);
   _loc1_.intervalID = setInterval(_loc1_,"clearText",interval);
};
Class_InterfaceText.prototype.clearText = function()
{
   var _loc1_ = this;
   _loc1_.txtZone.removeMovieClip();
   _loc1_.back.removeMovieClip();
   clearInterval(_loc1_.intervalID);
};
