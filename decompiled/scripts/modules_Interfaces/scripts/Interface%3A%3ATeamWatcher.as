Class_TeamWatcher = function()
{
   var _loc1_ = this;
   _loc1_.CHARAC_WIDTH = 90;
   _loc1_.CHARAC_HEIGHT = 120;
   _loc1_.HALF_TEAM_INTERVAL = 10;
   _loc1_.init();
};
Class_TeamWatcher.prototype = new MovieClip();
Object.registerClass("Interface::TeamWatcher",Class_TeamWatcher);
Class_TeamWatcher.prototype.init = function()
{
   var _loc1_;
   _loc1_ = new Color(this.background_mc.team0Color_mc);
   _loc1_.setRGB(TEAMS_COLOR[0]);
   _loc1_ = new Color(this.background_mc.team1Color_mc);
   _loc1_.setRGB(TEAMS_COLOR[1]);
};
Class_TeamWatcher.prototype.hide = function()
{
   this.removeMovieClip();
};
Class_TeamWatcher.prototype.setTeams = function(team0, team1)
{
   var _loc2_ = this;
   var _loc1_;
   var len;
   var x;
   var _loc3_;
   _loc2_.createEmptyMovieClip("team0_mc",10);
   len = team0.length;
   _loc2_.team0_mc._x = (- _loc2_.CHARAC_WIDTH) * len - _loc2_.HALF_TEAM_INTERVAL;
   _loc1_ = 0;
   while(_loc1_ < len)
   {
      _loc3_ = team0[_loc1_];
      x = _loc1_ * _loc2_.CHARAC_WIDTH;
      _loc2_.team0_mc.attachMovie("Interface::TeamWatcherCharacter","charac" + _loc3_.num,_loc1_,{_x:x,data:_loc3_,team:0,width:_loc2_.CHARAC_WIDTH,height:_loc2_.CHARAC_HEIGHT});
      _loc1_ = _loc1_ + 1;
   }
   _loc2_.createEmptyMovieClip("team1_mc",20);
   len = team1.length;
   _loc2_.team1_mc._x = _loc2_.HALF_TEAM_INTERVAL;
   _loc1_ = 0;
   while(_loc1_ < len)
   {
      _loc3_ = team1[_loc1_];
      x = _loc1_ * _loc2_.CHARAC_WIDTH;
      _loc2_.team1_mc.attachMovie("Interface::TeamWatcherCharacter","charac" + _loc3_.num,_loc1_,{_x:x,data:_loc3_,team:1,width:_loc2_.CHARAC_WIDTH,height:_loc2_.CHARAC_HEIGHT});
      _loc1_ = _loc1_ + 1;
   }
};
