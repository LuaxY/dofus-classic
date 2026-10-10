f = _parent.level;
_rotation = - angle;
c = 0;
while(c < 2 + f * f * 0.7)
{
   this.attachMovie("baton2","baton2" + c,c);
   c++;
}
