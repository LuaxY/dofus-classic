p = 0;
while(p < 20)
{
   this.attachMovie("plumes","plumes" + c,c);
   eval("this.plumes" + c).vx = 40 * (Math.random() - 0.5);
   eval("this.plumes" + c).vy = 40 * (Math.random() - 0.5);
   c++;
   p++;
}
