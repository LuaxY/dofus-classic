verou = 1;
stop();
var colors = _parent._parent.colors;
var i;
i = 1;
while(i < 4)
{
   this["color" + i + "_pbtn"].setColor(colors[i]);
   i++;
}
colorPicker_mc.addListener(this);
color1_pbtn.addListener(this);
color1_pbtn.groupWith(color2_pbtn);
color1_pbtn.groupWith(color3_pbtn);
color2_pbtn.addListener(this);
color2_pbtn.groupWith(color1_pbtn);
color2_pbtn.groupWith(color3_pbtn);
color3_pbtn.addListener(this);
color3_pbtn.groupWith(color1_pbtn);
color3_pbtn.groupWith(color2_pbtn);
color1_pbtn.unselectableItSelf = false;
color2_pbtn.unselectableItSelf = false;
color3_pbtn.unselectableItSelf = false;
color1_pbtn.select(true);
this._selectedButton = color1_pbtn;
this.onSelect = function(pbtn)
{
   this._selectedButton = pbtn;
};
this.onColorSelect = function(col)
{
   var _loc3_ = col;
   var _loc2_ = Number(this._selectedButton._name.substring(5,6));
   var _loc1_ = [0,-1,-1,-1];
   _loc1_[_loc2_] = _loc3_;
   this._selectedButton.setColor(_loc3_);
   _parent._parent.chooseColor(_loc3_,_loc2_);
   sprite_mc.clip_mc.gotoAndPlay("Init");
   CCOLORS.setColor(sprite_mc.clip_mc._target,_loc1_[1],_loc1_[2],_loc1_[3]);
};
this.onColorChange = function(col)
{
   this._selectedButton.setColor(col);
};
