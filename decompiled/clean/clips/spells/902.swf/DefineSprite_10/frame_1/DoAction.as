p = 0;
while(p < _parent._parent.level * 4)
{
   this.attachMovie("fumee","fumee" + c,c);
   eval("this.fumee" + c).vx = 40 * (Math.random() - 0.5);
   eval("this.fumee" + c).vy = 40 * (Math.random() - 0.5);
   c++;
   p++;
}
