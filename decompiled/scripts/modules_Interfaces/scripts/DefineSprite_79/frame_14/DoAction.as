verou = 1;
stop();
if(_parent._parent.sex == 0)
{
   man_pbtn.select(true);
   woman_pbtn.select(false);
}
else
{
   man_pbtn.select(false);
   woman_pbtn.select(true);
}
man_pbtn.addListener(this);
woman_pbtn.addListener(this);
man_pbtn.groupWith(woman_pbtn);
woman_pbtn.groupWith(man_pbtn);
man_pbtn.unselectableItSelf = false;
woman_pbtn.unselectableItSelf = false;
this.onSelect = function(pbtn)
{
   if(pbtn._name == "man_pbtn")
   {
      _parent._parent.chooseSex(0);
   }
   else
   {
      _parent._parent.chooseSex(1);
   }
};
