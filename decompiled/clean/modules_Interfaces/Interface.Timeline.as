Class_Interface_Timeline = function()
{
   this.init();
};
Class_Interface_Timeline.prototype = new MovieClip();
Object.registerClass("Interface::Timeline",Class_Interface_Timeline);
Class_Interface_Timeline.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.activate(false);
   _loc1_.currentPlayerIndex = null;
   _loc1_.currentDisplayIndex = 0;
   _loc1_.sequenceLength = null;
   _loc1_.itemsList = new Array();
};
Class_Interface_Timeline.prototype.activate = function(bool)
{
   var _loc1_ = this;
   if(bool)
   {
      _loc1_.marker._visible = true;
      _loc1_.generate();
   }
   else
   {
      _loc1_.marker._visible = false;
      _loc1_.items.removeMovieClip();
   }
};
Class_Interface_Timeline.prototype.nextTurn = function(characID)
{
   var _loc2_ = this;
   var _loc1_ = _loc2_.items["item" + characID];
   _loc2_.chrono = _loc1_.Chrono;
   _loc2_.marker.move(_loc1_._x);
};
Class_Interface_Timeline.prototype.generate = function()
{
   var _loc2_ = this;
   var cs = DATACENTER.Game.turnSequence;
   _loc2_.characList = new Array();
   var _loc1_;
   _loc1_ = 0;
   while(_loc1_ < cs.length)
   {
      _loc2_.characList.push(DATACENTER.Characters.getItemAt(cs[_loc1_]));
      _loc1_ = _loc1_ + 1;
   }
   _loc2_.sequenceLength = _loc2_.characlist.length;
   _loc2_.currentPlayerIndex = -1;
   _loc2_.items.removeMovieClip();
   _loc2_.createEmptyMovieClip("items",1);
   _loc2_.items._visible = false;
   var id;
   _loc1_ = 0;
   var _loc3_;
   while(_loc1_ < _loc2_.sequenceLength)
   {
      _loc3_ = _loc2_.characList[_loc1_];
      _loc2_.items.attachMovie("Interface::TimelineItem","item" + _loc3_.num,_loc1_,{_x:_loc1_ * 28,index:_loc1_,data:_loc3_});
      _loc1_ = _loc1_ + 1;
   }
   _loc2_.items._visible = true;
};
Class_Interface_Timeline.prototype.removePlayer = function(characID)
{
   var _loc1_ = this.items["item" + characID];
   var _loc2_ = new Color(_loc1_.sprite);
   _loc2_.setRGB(0);
};
