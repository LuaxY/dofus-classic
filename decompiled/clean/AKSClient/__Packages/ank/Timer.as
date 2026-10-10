class ank.Timer extends Object
{
   static var _IDs = new Array();
   static var _timer = new ank.Timer();
   function Timer()
   {
      super();
   }
   static function setTimer(obj, fn, interval, args)
   {
      var _loc1_ = obj;
      ank.Timer.garbageCollector();
      _loc1_.__ANKTIMERID__ = setInterval(ank.Timer.getInstance(),"onTimer",interval,_loc1_,fn,args);
      ank.Timer._IDs.push(new Array(_loc1_,_loc1_.__ANKTIMERID__));
   }
   static function getInstance()
   {
      return ank.Timer._timer;
   }
   static function garbageCollector()
   {
      var _loc1_;
      var _loc2_ = ank.Timer._IDs.length;
      _loc1_ = 0;
      while(_loc1_ < _loc2_)
      {
         if(ank.Timer._IDs[_loc1_][0] == undefined || typeof ank.Timer._IDs[_loc1_][0] == "movieclip" && ank.Timer._IDs[_loc1_][0]._name == undefined || ank.Timer._IDs[_loc1_][0].__ANKTIMERID__ != ank.Timer._IDs[_loc1_][1])
         {
            clearInterval(ank.Timer._IDs[_loc1_][1]);
            ank.Timer._IDs.splice(_loc1_,1);
         }
         _loc1_ = _loc1_ + 1;
      }
   }
   function onTimer(obj, fn, args)
   {
      var _loc1_ = obj;
      if(_loc1_ != undefined)
      {
         if(_loc1_.__ANKTIMERID__ != undefined)
         {
            clearInterval(_loc1_.__ANKTIMERID__);
            delete _loc1_.__ANKTIMERID__;
            fn.apply(_loc1_,args);
            ank.Timer.garbageCollector();
         }
      }
   }
}
