Class_Sequencer = function()
{
   var _loc1_ = this;
   _loc1_.unicID = String(getTimer()) + random(10000);
   _loc1_.ActionIndex = 0;
   _loc1_.clear();
};
Object.registerClass("Dofus::Sequencer",Class_Sequencer);
Class_Sequencer.prototype.onSequenceEnd = null;
Class_Sequencer.prototype.addAction = function(_waitEnd, _object, _function, _parameters)
{
   var _loc1_ = new Object();
   _loc1_.id = this.getActionIndex();
   _loc1_.waitEnd = _waitEnd;
   _loc1_.object = _object;
   _loc1_.fn = _function;
   _loc1_.parameters = _parameters;
   this.actions.push(_loc1_);
};
Class_Sequencer.prototype.play = function()
{
   var _loc2_ = this;
   _loc2_.bPlaying = true;
   var i;
   var _loc1_;
   if(_loc2_.actions.length > 0)
   {
      _loc1_ = _loc2_.actions[0];
      if(_loc1_.waitEnd)
      {
         _loc1_.object[_loc2_.unicID] = _loc1_.id;
      }
      _loc1_.fn.apply(_loc1_.object,_loc1_.parameters);
      if(!_loc1_.waitEnd)
      {
         _loc2_.onActionEnd(_loc1_.id);
      }
      else
      {
         _loc2_.clearTimeOut();
         _loc2_.timeoutID = setInterval(_loc2_,"onActionTimeOut",SEQUENCER_TIMEOUT,_loc1_.id);
      }
   }
   else
   {
      _loc2_.stop();
   }
};
Class_Sequencer.prototype.isPlaying = function()
{
   return this.bPlaying;
};
Class_Sequencer.prototype.stop = function()
{
   this.bPlaying = false;
};
Class_Sequencer.prototype.clear = function()
{
   var _loc1_ = this;
   _loc1_.clearTimeOut();
   _loc1_.actions = new Array();
   _loc1_.bPlaying = false;
};
Class_Sequencer.prototype.clearAllNextActions = function()
{
   this.actions.splice(1,this.actions.length - 1);
};
Class_Sequencer.prototype.onActionTimeOut = function(actionID)
{
   trace("TIMEOUT !!!");
   this.onActionEnd(actionID);
};
Class_Sequencer.prototype.onActionEnd = function(actionID)
{
   var _loc1_ = this;
   if(_loc1_.actions.length == 0)
   {
      _loc1_.clearTimeOut();
   }
   else
   {
      var act = _loc1_.actions[0];
      _loc1_.clearTimeOut();
      var i;
      _loc1_.actions.shift();
      if(_loc1_.actions.length == 0)
      {
         _loc1_.clear();
         _loc1_.onSequenceEnd();
      }
      else if(_loc1_.bPlaying)
      {
         _loc1_.play();
      }
   }
};
Class_Sequencer.prototype.clearTimeOut = function()
{
   clearInterval(this.timeoutID);
};
Class_Sequencer.prototype.getActionIndex = function()
{
   var _loc1_ = this;
   var _loc2_ = _loc1_.ActionIndex;
   _loc1_.ActionIndex = _loc1_.ActionIndex + 1;
   if(_loc1_.ActionIndex > 10000)
   {
      _loc1_.ActionIndex = 0;
   }
   return _loc2_;
};
