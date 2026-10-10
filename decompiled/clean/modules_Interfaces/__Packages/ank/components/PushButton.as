class ank.components.PushButton extends MovieClip
{
   var _group;
   var background_mc;
   var m_Params;
   var m_bSelected = false;
   var m_bEnabled = false;
   var m_color = 0;
   var m_bUnselectableItSelf = true;
   function PushButton()
   {
      super();
      this.initialize();
   }
   function initialize()
   {
      var _loc1_ = this;
      _loc1_.stop(); //unpopped
      AsBroadcaster.initialize(_loc1_);
      _loc1_.setEnabled(true);
      _loc1_._group = new Array();
   }
   function setEnabled(bool)
   {
      var _loc1_ = this;
      _loc1_.m_bEnabled = bool;
      if(bool)
      {
         _loc1_.onRollOver = _loc1_._frollOver;
         _loc1_.onRollOut = _loc1_.onReleaseOutside = _loc1_._frollOut;
         _loc1_.onRelease = _loc1_._frelease;
      }
      else
      {
         delete _loc1_.onRollOver;
         delete _loc1_.onRollOut;
         delete _loc1_.onRelease;
      }
   }
   function select(bool, bHimSelf)
   {
      var _loc2_ = this;
      var _loc1_;
      var _loc3_;
      if(!(_loc2_.m_bUnselectableItSelf == false && bHimSelf && bool == false))
      {
         _loc2_.m_bSelected = bool;
         if(bHimSelf)
         {
            _loc2_.broadcastMessage("onSelect",_loc2_);
            _loc3_ = _loc2_._group.length;
            _loc1_ = 0;
            while(_loc1_ < _loc3_)
            {
               _loc2_._group[_loc1_].select(false,false);
               _loc1_ = _loc1_ + 1;
            }
         }
         if(bool)
         {
            _loc2_.gotoAndStop("selected");
         }
         else
         {
            _loc2_.gotoAndStop("out");
         }
      }
   }
   function setColor(col)
   {
      this.m_color = col;
      this._fapplyColor(col);
   }
   function groupWith(pbtn)
   {
      this._group.push(pbtn);
   }
   function get params()
   {
      return this.m_Params;
   }
   function get selected()
   {
      return this.m_bSelected;
   }
   function get enabled()
   {
      return this.m_bEnabled;
   }
   function get getColor()
   {
      return this.m_color;
   }
   function set unselectableItSelf(bool)
   {
      this.m_bUnselectableItSelf = bool;
   }
   function get unselectableItSelf()
   {
      return this.m_bUnselectableItSelf;
   }
   function _frelease()
   {
      this.select(!this.selected,true);
   }
   function _frollOver()
   {
      var _loc1_ = this;
      _loc1_.gotoAndStop("over");
      _loc1_.broadcastMessage("onToolTipOn",_loc1_);
   }
   function _frollOut()
   {
      var _loc1_ = this;
      if(_loc1_.selected)
      {
         _loc1_.gotoAndStop("selected");
      }
      else
      {
         _loc1_.gotoAndStop("out");
      }
      _loc1_.broadcastMessage("onToolTipOff",_loc1_);
   }
   function _fapplyColor(col)
   {
      var _loc1_ = new Color(this.background_mc);
      _loc1_.setRGB(col);
   }
}
