PalletsColorSelectorClass = function()
{
   var _loc2_ = this;
   _loc2_.createEmptyMovieClip("back",1);
   _loc2_.createEmptyMovieClip("top",2);
   var rot = 0;
   var _loc1_ = 0;
   var _loc3_;
   while(_loc1_ < 20)
   {
      _loc2_.back.attachMovie("ColorSelectorSymbol","cs" + _loc1_,_loc1_);
      var cs = _loc2_.back["cs" + _loc1_];
      cs._rotation = rot;
      _loc2_.top.attachMovie("btnColorSelectorSymbol","btncs" + _loc1_,_loc1_);
      _loc3_ = _loc2_.top["btncs" + _loc1_];
      _loc3_._rotation = rot;
      _loc3_.onRelease = function()
      {
         this._parent._parent.onSelectRelease(this.colorValue);
      };
      rot += 5;
      _loc1_ = _loc1_ + 1;
   }
   _loc2_.setColors([0,6312024,1057164,4078462,5594016,3372031,7836752,9022264,9915938,13260056,14310932,15755809,16678400,16466433,14393109,15975946,16777166,16777215,16751052,16711782]);
};
PalletsColorSelectorClass.prototype = new MovieClip();
Object.registerClass("PalletsColorSelectorSymbol",PalletsColorSelectorClass);
PalletsColorSelectorClass.prototype.setColors = function(colors)
{
   var _loc2_ = colors;
   var _loc1_ = 0;
   var _loc3_;
   while(_loc1_ < _loc2_.length)
   {
      var r = (_loc2_[_loc1_] & 0xFF0000) >> 16;
      var v = (_loc2_[_loc1_] & 0xFF00) >> 8;
      var b = _loc2_[_loc1_] & 0xFF;
      var cs = this.back["cs" + _loc1_];
      var maCouleur = new Color(cs);
      _loc3_ = new Object();
      _loc3_ = {ra:"0",rb:r,ga:"0",gb:v,ba:"0",bb:b,aa:"100",ab:"0"};
      maCouleur.setTransform(_loc3_);
      this.top["btncs" + _loc1_].colorValue = _loc2_[_loc1_];
      _loc1_ = _loc1_ + 1;
   }
};
