menu1.guild_txt.setText(getText("CREATE_GUILD"),"Font1");
menu2.sex_txt.setText(getText("CREATE_SEX"),"Font1");
menu3.color_txt.setText(getText("CREATE_COLOR"),"Font1");
menu4.name_txt.setText(getText("CREATE_NAME"),"Font1");
hmenu = 20;
menu2.gotoAndStop(23);
menu3.gotoAndStop(23);
menu4.gotoAndStop(23);
m1 = 1;
m2 = 0;
m3 = 0;
m4 = 0;
this.onEnterFrame = function()
{
   menu2._y = menu1._y + hmenu * menu1.taille._yscale / 100;
   menu3._y = menu2._y + hmenu * menu2.taille._yscale / 100;
   menu4._y = menu3._y + hmenu * menu3.taille._yscale / 100;
   if(m1 == 1 and menu1._currentframe == 23)
   {
      menu1.gotoAndPlay(2);
   }
   if(m2 == 1 and menu2._currentframe == 23)
   {
      menu2.gotoAndPlay(2);
   }
   if(m3 == 1 and menu3._currentframe == 23)
   {
      menu3.gotoAndPlay(2);
   }
   if(m4 == 1 and menu4._currentframe == 23)
   {
      menu4.gotoAndPlay(2);
   }
   if(m1 == 1)
   {
      if(menu1._y != 0)
      {
         if(menu1._y > 0)
         {
            menu1._y -= 5;
         }
         else
         {
            menu1._y += 5;
         }
      }
   }
   if(m2 == 1)
   {
      if(menu1._y != -20)
      {
         if(menu1._y > -20)
         {
            menu1._y -= 5;
         }
         else
         {
            menu1._y += 5;
         }
      }
   }
   if(m3 == 1)
   {
      if(menu1._y != -40)
      {
         if(menu1._y > -40)
         {
            menu1._y -= 5;
         }
         else
         {
            menu1._y += 5;
         }
      }
   }
   if(m4 == 1)
   {
      if(menu1._y != -60)
      {
         if(menu1._y > -60)
         {
            menu1._y -= 5;
         }
         else
         {
            menu1._y += 5;
         }
      }
   }
};
