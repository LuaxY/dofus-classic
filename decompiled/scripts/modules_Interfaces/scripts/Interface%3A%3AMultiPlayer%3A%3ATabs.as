Class_InterfaceMultiPlayerTabs = function()
{
   this.tabLayers = ["TabStart","TabGameJoined","TabJoinGame","TabPlayDofus","TabFriends","TabPlayDofusStart"];
   this.init();
};
Class_InterfaceMultiPlayerTabs.prototype = new MovieClip();
Object.registerClass("Interface::MultiPlayer::Tabs",Class_InterfaceMultiPlayerTabs);
Class_InterfaceMultiPlayerTabs.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.width = _loc1_._width;
   _loc1_.height = _loc1_._height;
   _loc1_.onEnterFrame = function()
   {
      this.showLayer("TabStart",false);
      delete this.onEnterFrame;
   };
};
Class_InterfaceMultiPlayerTabs.prototype.showLayer = function(layerName, bAnim, bForce)
{
   var _loc1_ = this;
   var _loc2_ = bForce;
   var _loc3_ = bAnim;
   if(_loc2_ == undefined)
   {
      _loc2_ = false;
   }
   if(_loc1_.bInMove)
   {
      if(_loc2_)
      {
         trace("boo");
      }
      else
      {
         return;
      }
   }
   if(_loc3_ == undefined)
   {
      _loc3_ = true;
   }
   var oldLayer = _loc1_.tabLayers[_loc1_.currLayer];
   if(oldLayer != layerName)
   {
      _loc1_.tmpOldLayer = oldLayer;
      _loc1_.tmplayerName = layerName;
      if(_loc1_.currLayer != undefined)
      {
         _loc1_[oldLayer].onLostFocus();
      }
      var i = 0;
      while(i < _loc1_.tabLayers.length)
      {
         if(_loc1_.tabLayers[i] == layerName)
         {
            _loc1_.currLayer = i;
         }
         i++;
      }
      _loc1_[layerName]._visible = true;
      _loc1_.bInMove = false;
      if(_loc3_)
      {
         _loc1_.bInMove = true;
         _loc1_[layerName]._x = - _loc1_.width;
         var i = 0;
         _loc1_.onEnterFrame = function()
         {
            var _loc1_ = this;
            i++;
            _loc1_[layerName]._x += i * i;
            _loc1_[oldLayer]._x += i * i;
            if(_loc1_[layerName]._x > 0)
            {
               _loc1_.finishMove(layerName,oldLayer);
            }
         };
      }
      else
      {
         _loc1_[layerName].onFocusFinal();
      }
      _loc1_[layerName].onFocus();
   }
};
Class_InterfaceMultiPlayerTabs.prototype.finishMove = function(layerName, oldLayer)
{
   var _loc1_ = this;
   delete _loc1_.tmpOldLayer;
   delete _loc1_.tmplayerName;
   _loc1_[layerName]._x = 0;
   _loc1_[oldLayer]._visible = false;
   _loc1_.bInMove = false;
   delete _loc1_.onEnterFrame;
   _loc1_[layerName].onFocusFinal();
};
Class_InterfaceMultiPlayerTabs.prototype.getCurrentLayer = function()
{
   return this.currLayer;
};
