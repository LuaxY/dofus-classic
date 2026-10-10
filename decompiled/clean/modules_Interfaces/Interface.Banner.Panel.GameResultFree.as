Class_InterfaceBannerPanelGameResultFree = function()
{
   this.init();
};
Class_InterfaceBannerPanelGameResultFree.prototype = new MovieClip();
Object.registerClass("Interface::Banner::Panel::GameResultFree",Class_InterfaceBannerPanelGameResultFree);
Class_InterfaceBannerPanelGameResultFree.prototype.init = function()
{
   var data = DATACENTER.Game.Results;
   var _loc3_ = data.winners;
   var ld = data.losers;
   var _loc1_;
   var _loc2_;
   var strDeadAlive;
   this.txtGameResult.setText(getText("GAME_RESULTS"),"Font2");
   this.txtWinners.setText(getText("WINNERS"),"Font2");
   this.txtLosers.setText(getText("LOSERS"),"Font2");
   this.txtStats.setText(getText("STATS"),"Font2");
   this.btnQuit.setText(getText("LEAVE"));
   this.createEmptyMovieClip("winners",10);
   this.winners._x = -693;
   this.winners._y = -343;
   this.createEmptyMovieClip("losers",20);
   this.losers._x = -693;
   this.losers._y = -229;
   _loc1_ = 0;
   while(_loc1_ < _loc3_.length)
   {
      _loc2_ = this.winners.attachMovie("Interface::Banner::Panel::GameResult::PlayerFree","player" + _loc1_,_loc1_,{_y:_loc1_ * 19,bMe:_loc3_[_loc1_].id == DATACENTER.Player.ID});
      _loc2_.txtName.setText(_loc3_[_loc1_].name,"Font2");
      _loc2_.txtLevel.setText(getText("LEVEL") + " " + _loc3_[_loc1_].level,"Font2");
      strDeadAline = !_loc3_[_loc1_].bDead ? getText("ALIVE") : getText("DEAD");
      _loc2_.txtDead.setText(strDeadAline,"Font2");
      _loc1_ = _loc1_ + 1;
   }
   _loc1_ = 0;
   while(_loc1_ < ld.length)
   {
      var bMe = ld[_loc1_].id == DATACENTER.Player.ID;
      if(bMe)
      {
         this.btnKDO._visible = false;
      }
      _loc2_ = this.losers.attachMovie("Interface::Banner::Panel::GameResult::PlayerFree","player" + _loc1_,_loc1_,{_y:_loc1_ * 19,bMe:bMe});
      _loc2_.txtName.setText(ld[_loc1_].name,"Font2");
      _loc2_.txtLevel.setText(getText("LEVEL") + " " + ld[_loc1_].level,"Font2");
      strDeadAline = !ld[_loc1_].bDead ? getText("ALIVE") : getText("DEAD");
      _loc2_.txtDead.setText(strDeadAline,"Font2");
      _loc1_ = _loc1_ + 1;
   }
};
