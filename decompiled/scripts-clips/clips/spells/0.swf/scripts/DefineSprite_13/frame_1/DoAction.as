_Y = random(50) - 50;
_parent.attachMovie("griffes","griffes" + _parent.cpt,_parent.cpt + 100);
eval("_parent.griffes" + _parent.cpt)._y = _Y;
eval("_parent.griffes" + _parent.cpt)._rotation = _rotation;
_parent.cpt++;
if(_parent.cpt > 10)
{
   stop();
}
