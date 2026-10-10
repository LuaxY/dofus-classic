nb = 10 + _parent.level * 3;
c = 1;
while(c < nb)
{
   this.attachMovie("cercle","cercle" + c,c);
   c++;
}
