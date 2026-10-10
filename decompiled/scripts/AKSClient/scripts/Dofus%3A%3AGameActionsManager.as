Class_GameActionsManager = function(_DATA)
{
   var _loc1_ = this;
   _loc1_.init();
   _loc1_._DATA = _DATA;
   _loc1_.STATE_TRANSMITTING = 2;
   _loc1_.STATE_IN_PROGRESS = 1;
   _loc1_.STATE_READY = 0;
};
Object.registerClass("Dofus::GameActionsManager",Class_GameActionsManager);
Class_GameActionsManager.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.m_id = undefined;
   _loc1_.m_bNextAction = false;
   _loc1_.m_state = _loc1_.STATE_READY;
   _loc1_.currentType = null;
};
Class_GameActionsManager.prototype.transmittingMove = function(type, params)
{
   var _loc1_ = this;
   var _loc2_ = type;
   if(!_loc1_.isWaiting())
   {
      AKS.Game.sendActions(_loc2_,params);
      _loc1_.m_state = _loc1_.STATE_TRANSMITTING;
      _loc1_.currentType = _loc2_;
   }
   else if(_loc1_.canCancel(_loc2_))
   {
      _loc1_.cancel(_loc1_._DATA.clip.getCellNum());
      _loc1_.transmittingMove(_loc2_,params);
   }
   else
   {
      trace("L\'état de l\'action ne permet pas de faire ceci");
   }
};
Class_GameActionsManager.prototype.transmittingOther = function(type, params)
{
   var _loc1_ = this;
   if(!_loc1_.isWaiting())
   {
      AKS.Game.sendActions(type,params);
      _loc1_.m_state = _loc1_.STATE_TRANSMITTING;
      _loc1_.currentType = type;
   }
   else
   {
      trace("L\'état de l\'action ne permet pas de faire ceci");
   }
};
Class_GameActionsManager.prototype.onServerResponse = function(id)
{
   var _loc1_ = this;
   _loc1_.m_id = id;
   _loc1_.m_state = _loc1_.STATE_IN_PROGRESS;
};
Class_GameActionsManager.prototype.cancel = function(params)
{
   var _loc1_ = this;
   _loc1_.currentType = null;
   if(_loc1_.canCancel())
   {
      AKS.Game.ActionCancel(_loc1_.m_id,params);
      _loc1_._DATA.clip.stopMove();
      _loc1_.init();
   }
};
Class_GameActionsManager.prototype.end = function(IAmSender)
{
   var _loc1_ = this;
   if(_loc1_.m_bNextAction == false || !IAmSender)
   {
      _loc1_.init();
   }
   else
   {
      _loc1_.m_state = _loc1_.STATE_TRANSMITTING;
      _loc1_.m_id = undefined;
   }
};
Class_GameActionsManager.prototype.ack = function(idAction)
{
   AKS.Game.ActionAck(idAction);
   this.end(true);
};
Class_GameActionsManager.prototype.isWaiting = function()
{
   var _loc1_ = this;
   switch(_loc1_.m_state)
   {
      case _loc1_.STATE_READY:
         return false;
      case _loc1_.STATE_TRANSMITTING:
      case _loc1_.STATE_IN_PROGRESS:
         return true;
      default:
         return false;
   }
};
Class_GameActionsManager.prototype.canCancel = function(type)
{
   var _loc1_ = this;
   if(type != _loc1_.currentType)
   {
      return false;
   }
   switch(_loc1_.m_state)
   {
      case _loc1_.STATE_TRANSMITTING:
         return false;
      case _loc1_.STATE_READY:
      case _loc1_.STATE_IN_PROGRESS:
         return true;
      default:
         return false;
   }
};
