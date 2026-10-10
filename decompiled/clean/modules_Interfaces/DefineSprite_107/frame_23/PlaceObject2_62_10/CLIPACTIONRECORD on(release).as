on(release){
   if(_parent.verou == 1)
   {
      _parent._parent.m1 = 0;
      _parent._parent.m2 = 0;
      _parent._parent.m3 = 0;
      _parent._parent.m4 = 1;
      if(_parent._parent.menu2._currentframe <= 14)
      {
         _parent._parent.menu2.gotoAndPlay(15);
      }
      if(_parent._parent.menu3._currentframe <= 14)
      {
         _parent._parent.menu3.gotoAndPlay(15);
      }
      if(_parent._parent.menu1._currentframe <= 14)
      {
         _parent._parent.menu1.gotoAndPlay(15);
      }
      _parent.gotoAndPlay(1);
   }
}
