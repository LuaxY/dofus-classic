Class_InterfaceBannerMain = function()
{
   this.init();
};
Class_InterfaceBannerMain.prototype = new MovieClip();
Object.registerClass("Interface::Banner::Main",Class_InterfaceBannerMain);
Class_InterfaceBannerMain.prototype.init = function()
{
   var _loc1_ = this;
   if(DATACENTER.Game.isFight)
   {
      _loc1_.attachMovie("BtnNextTurnBanner","btnNextTurnBanner",100,{_x:0,_y:18});
      _loc1_.attachMovie("Interface::Heart","Heart",200,{_x:-13,_y:6});
      _loc1_.attachMovie("Interface::ActionPoints","ActionPoints",300,{_x:32,_y:6});
      _loc1_.attachMovie("Interface::BtnCC","BtnCC",400,{_x:120,_y:61});
   }
   CHAT.clear();
   Selection.setFocus("consoleContent");
};
