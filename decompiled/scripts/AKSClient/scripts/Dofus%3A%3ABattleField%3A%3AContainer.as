Class_BattleField_Container = function()
{
   this.init();
};
Class_BattleField_Container.prototype = new MovieClip();
Object.registerClass("Dofus::BattleField::Container",Class_BattleField_Container);
Class_BattleField_Container.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.createEmptyMovieClip("Interaction",100);
   _loc1_.Interaction.createEmptyMovieClip("layer0",100);
   _loc1_.Interaction.createEmptyMovieClip("layer1",200);
   if(_loc1_.Ground == undefined)
   {
      _loc1_.createEmptyMovieClip("Ground",200);
      _loc1_.Ground.loadMovie(CLIPS_PATH + "ground.swf");
   }
   else
   {
      _loc1_.Ground.clear();
   }
   if(_loc1_.Object1 == undefined)
   {
      _loc1_.createEmptyMovieClip("Object1",300);
      _loc1_.Object1.loadMovie(CLIPS_PATH + "objects.swf");
   }
   else
   {
      _loc1_.Object1.clear();
   }
   _loc1_.createEmptyMovieClip("Selection",400);
   _loc1_.createEmptyMovieClip("Grid",500);
   _loc1_.Grid._alpha = 15;
   _loc1_.Grid._visible = false;
   _loc1_.createEmptyMovieClip("Pointer",600);
   if(_loc1_.Object2 == undefined)
   {
      _loc1_.createEmptyMovieClip("Object2",700);
      _loc1_.Object2.loadMovie(CLIPS_PATH + "objects.swf");
   }
   else
   {
      _loc1_.Object2.clear();
   }
   _loc1_.createEmptyMovieClip("Text",800);
   _loc1_.createEmptyMovieClip("Effect",900);
};
Class_BattleField_Container.prototype.applyMask = function(w, h)
{
   this.createEmptyMovieClip("mask",2);
   with(this.mask)
   {
      beginFill("0x000000",100);
      moveTo(0,0);
      lineTo(w * 53,0);
      lineTo(w * 53,h * 27);
      lineTo(0,h * 27);
      lineTo(0,0);
      endFill();
   }
   this.setMask(this.mask);
};
Class_BattleField_Container.prototype.centerMap = function()
{
   var _loc3_ = this;
   var _loc2_ = _loc3_._xscale / 100;
   var _loc1_ = _loc3_._yscale / 100;
   var x = (742 - 53 * _loc2_ * (DATACENTER.Map.width - 1)) / 2;
   var y = (432 - 27 * _loc1_ * (DATACENTER.Map.height - 1)) / 2;
   _loc3_.setXY(x,y);
};
Class_BattleField_Container.prototype.zoomMap = function()
{
   var _loc3_ = DATACENTER.Map.width - 1;
   var _loc2_ = DATACENTER.Map.height - 1;
   var _loc1_ = 0;
   if(_loc3_ > 15)
   {
      if(_loc2_ > 17)
      {
         if(_loc2_ > _loc3_)
         {
            _loc1_ = 742 / (53 * _loc3_) * 100;
         }
         else
         {
            _loc1_ = 432 / (27 * _loc2_) * 100;
         }
         this.zoom(_loc1_,false);
      }
   }
};
Class_BattleField_Container.prototype.setXY = function(x, y)
{
   this._x = x;
   this._y = y;
};
Class_BattleField_Container.prototype.showAll = function(bool)
{
   var _loc1_ = this;
   var _loc2_ = bool;
   for(var _loc3_ in _loc1_)
   {
      _loc1_.show(_loc3_,_loc2_);
   }
};
Class_BattleField_Container.prototype.show = function(layer, bool)
{
   this[layer]._visible = bool ? bool : !this[layer]._visible;
};
Class_BattleField_Container.prototype.clear = function()
{
   this.init();
};
Class_BattleField_Container.prototype.zoom = function(f, bAdd)
{
   var _loc1_ = this;
   var _loc2_ = bAdd;
   var _loc3_ = f;
   if(_loc2_ == undefined)
   {
      _loc2_ = true;
   }
   _loc1_._xscale = !_loc2_ ? _loc3_ : _loc1_._xscale + _loc3_;
   _loc1_._yscale = !_loc2_ ? _loc3_ : _loc1_._yscale + _loc3_;
   _loc1_.centerMap();
};
Class_BattleField_Container.prototype.setColor = function(bDefault)
{
   var _loc2_;
   var _loc1_;
   if(bDefault)
   {
      _loc2_ = new Color(this);
      _loc1_ = new Object();
      _loc1_.ra = 100;
      _loc1_.rb = 0;
      _loc1_.ga = 100;
      _loc1_.gb = 0;
      _loc1_.ba = 100;
      _loc1_.bb = 0;
      _loc2_.setTransform(_loc1_);
   }
   else
   {
      _loc2_ = new Color(this);
      _loc1_ = new Object();
      _loc1_.ra = 38;
      _loc1_.rb = 0;
      _loc1_.ga = 38;
      _loc1_.gb = 0;
      _loc1_.ba = 60;
      _loc1_.bb = 0;
      _loc2_.setTransform(_loc1_);
   }
};
ASSetPropFlags(Class_BattleField_Container.prototype,null,1,1);
