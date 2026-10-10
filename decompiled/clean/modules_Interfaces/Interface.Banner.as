Class_InterfaceBanner = function()
{
   var _loc1_ = this;
   _loc1_.PANEL_Y_TRUE = 432;
   _loc1_.PANEL_Y_FALSE = 1000;
   _loc1_.init();
};
Class_InterfaceBanner.prototype = new MovieClip();
Object.registerClass("Interface::Banner",Class_InterfaceBanner);
Class_InterfaceBanner.prototype.onAddUsedSpell = null;
Class_InterfaceBanner.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.createEmptyMovieClip("extraPanels",100);
   _loc1_.createEmptyMovieClip("panels",200);
   _loc1_.attachMovie("Interface::Banner::Main","banner",300,{_x:366,_y:419});
   _loc1_.panels.attachMovie("Interface::Banner::Panel::Inventory","Inventory",100,{_x:732,_y:_loc1_.PANEL_Y_FALSE});
   _loc1_.panels.attachMovie("Interface::Banner::Panel::Spells","Spells",200,{_x:732,_y:_loc1_.PANEL_Y_FALSE});
   _loc1_.panels.attachMovie("Interface::Banner::Panel::PlayerInfos","PlayerInfos",300,{_x:732,_y:_loc1_.PANEL_Y_FALSE});
   AKS.Chat.output = _loc1_.banner;
   AKS.Game.output = _loc1_;
   _loc1_.extraPanelDepth = 0;
   _loc1_.data = DATACENTER.Characters.getItemAt(DATACENTER.Player.ID);
   _loc1_.onSetLP(_loc1_.data.LP,_loc1_.data.LPmax);
   _loc1_.onSetAP(_loc1_.data.AP);
   _loc1_.onEnterFrame = function()
   {
      var _loc1_ = this;
      trace("#############" + _loc1_.updateSpells);
      _loc1_.updateSpells();
      delete _loc1_.onEnterFrame;
   };
   INTERFACE.addToListner(_loc1_);
   DATACENTER.Player.data.addListener(_loc1_);
};
Class_InterfaceBanner.prototype.updateSpells = function()
{
   var p = DATACENTER.Player;
   var ps = this.panels.Spells;
   var _loc3_ = ["Air","Water","Earth","Fire"];
   var _loc1_;
   trace("##");
   _loc1_ = 0;
   var _loc2_;
   while(_loc1_ < 4)
   {
      var d = p["Spells" + _loc3_[_loc1_]];
      var len = d.length;
      _loc2_ = 0;
      while(_loc2_ < len)
      {
         var spell = d[_loc2_];
         ps["tab" + _loc3_[_loc1_]].spellGrid["s" + (_loc2_ + 1)].container.setItem(spell);
         _loc2_ = _loc2_ + 1;
      }
      _loc1_ = _loc1_ + 1;
   }
   var d = p.SpellsGuild;
   var len = d.length;
   _loc2_ = 0;
   while(_loc2_ < len)
   {
      var spell = d[_loc2_];
      ps.tabGuild["s" + (_loc2_ + 1)].container.setItem(spell);
      _loc2_ = _loc2_ + 1;
   }
   var len = DATACENTER.Player.SpellsUsed.getLength();
   _loc2_ = 0;
   while(_loc2_ < len)
   {
      var spell = DATACENTER.Player.SpellsUsed.getItemAt(_loc2_);
      this.banner["us" + _loc2_].container.setItem(spell);
      _loc2_ = _loc2_ + 1;
   }
};
Class_InterfaceBanner.prototype.showPanel = function(panelName, params)
{
   var _loc1_ = this;
   var _loc2_ = panelName;
   if(_loc1_.currentPanel != _loc2_)
   {
      _loc1_.hidePanel(_loc1_.currentPanel);
      _loc1_.panels[_loc2_]._y = _loc1_.PANEL_Y_TRUE;
      _loc1_.panels[_loc2_].setParams(params);
      BATTLEFIELD.Interaction.hideInteractions(true);
      _loc1_.currentPanel = _loc2_;
      Mouse.addListener(_loc1_);
      _loc1_.onMouseUp = function()
      {
         var _loc1_ = this;
         if(!_loc1_.hitTest(_xmouse,_ymouse,true))
         {
            _loc1_.hidePanel(_loc1_.currentPanel);
            Mouse.removeListener(_loc1_);
            delete _loc1_.onMouseUp;
         }
      };
   }
   else
   {
      _loc1_.hidePanel(_loc1_.currentPanel);
   }
};
Class_InterfaceBanner.prototype.hidePanel = function()
{
   var _loc1_ = this;
   delete _loc1_.onMouseUp;
   Mouse.removeListener(_loc1_);
   BATTLEFIELD.Interaction.hideInteractions(false);
   KERNEL.cleanUpGameArea();
   _loc1_.panels[_loc1_.currentPanel].onLostFocus();
   _loc1_.panels[_loc1_.currentPanel]._y = _loc1_.PANEL_Y_FALSE;
   delete _loc1_.currentPanel;
};
Class_InterfaceBanner.prototype.showExtraPanel = function(panelName)
{
   var _loc1_ = this;
   BATTLEFIELD.Interaction.hideInteractions(true);
   INTERFACE.hideMessageNextTurn();
   _loc1_.extraPanels.attachMovie("Interface::Banner::Panel::" + panelName,panelName,_loc1_.extraPanelDepth,{_x:742,_y:432});
   trace(_loc1_.extraPanels.panelName);
   _loc1_.extraPanelDepth = _loc1_.extraPanelDepth + 1;
};
Class_InterfaceBanner.prototype.hideExtraPanel = function(panelName)
{
   BATTLEFIELD.Interaction.hideInteractions(false);
   this.extraPanels[panelName].removeMovieClip();
   this.extraPanelDepth--;
};
Class_InterfaceBanner.prototype.getCurrentPanel = function()
{
   return this.currentPanel;
};
Class_InterfaceBanner.prototype.onSetLP = function(value, max)
{
   this.banner.Heart.setlifePoints(value,max);
};
Class_InterfaceBanner.prototype.onSetAP = function(value)
{
   this.banner.ActionPoints.setActionPoints(value);
};
Class_InterfaceBanner.prototype.updateTimer = function()
{
   this.banner.chrono.updateTimer();
};
Class_InterfaceBanner.prototype.startTimer = function(t)
{
   if(DATACENTER.Player.isCurrentPlayer)
   {
      this.banner.chrono.startTimer(t);
   }
   else
   {
      this.banner.timeline.chrono.startTimer(t);
   }
};
Class_InterfaceBanner.prototype.stopTimer = function()
{
   this.banner.chrono.stopTimer();
   this.banner.timeline.chrono.stopTimer();
};
Class_InterfaceBanner.prototype.activateTimeline = function(bool)
{
   trace("activateTimeline");
   this.banner.timeline.activate(bool);
};
Class_InterfaceBanner.prototype.nextTurnTimeline = function(characID)
{
   this.banner.timeline.nextTurn(characID);
};
Class_InterfaceBanner.prototype.removePlayerTimeline = function(characID)
{
   this.banner.timeline.removePlayer(characID);
};
Class_InterfaceBanner.prototype.setPlayerHeadAnim = function(anim)
{
   this.banner.PlayerHead.setAnim(anim);
};
Class_InterfaceBanner.prototype.showNextSpellTab = function()
{
   this.panels.Spells.showNextTab();
};
