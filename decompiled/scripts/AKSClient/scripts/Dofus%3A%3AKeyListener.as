Class_KeyListener = function(string)
{
   this.init();
   this.justValidEnter = false;
};
Object.registerClass("Dofus::KeyListener",Class_KeyListener);
Class_KeyListener.prototype.init = function()
{
   this.onKeyUp = function()
   {
      if(Key.getCode() == 13 && !this.justValidEnter)
      {
         Selection.setFocus(AKS.Chat.output.txtConsole);
         this.justValidEnter = false;
      }
      var _loc1_;
      if(Key.getCode() == 38 || Key.getCode() == 33)
      {
         if(AKS.Chat.output)
         {
            _loc1_ = AKS.Chat.output.txtConsole;
            Selection.setFocus(_loc1_);
            Selection.setSelection(_loc1_.text.length,1000);
         }
      }
      if(Key.getCode() == 40 || Key.getCode() == 34)
      {
         if(AKS.Chat.output)
         {
            _loc1_ = AKS.Chat.output.txtConsole;
            Selection.setFocus(_loc1_);
            Selection.setSelection(_loc1_.text.length,1000);
         }
      }
   };
   this.onKeyDown = function()
   {
      if(Key.isDown(33))
      {
         if(AKS.Chat.output)
         {
            AKS.Chat.output.txtConsole.text = AKS.Console.getWhisperHistoryUp();
         }
      }
      if(Key.isDown(34))
      {
         if(AKS.Chat.output)
         {
            AKS.Chat.output.txtConsole.text = AKS.Console.getWhisperHistoryDown();
         }
      }
      if(Key.isDown(38))
      {
         if(AKS.Chat.output)
         {
            var console = AKS.Chat.output.txtConsole;
            if(Key.isDown(16))
            {
               console.text = AKS.Console.getWhisperHistoryUp();
            }
            else
            {
               console.text = AKS.Console.getHistoryUp();
            }
         }
      }
      if(Key.isDown(40))
      {
         if(AKS.Chat.output)
         {
            var console = AKS.Chat.output.txtConsole;
            if(Key.isDown(16))
            {
               console.text = AKS.Console.getWhisperHistoryDown();
            }
            else
            {
               console.text = AKS.Console.getHistoryDown();
            }
         }
      }
      if(Key.isDown(13))
      {
         var sel = Selection.getFocus();
         var selName = eval(sel)._name;
         if(sel == null || sel == undefined)
         {
            return undefined;
         }
         this.justValidEnter = true;
         switch(selName)
         {
            case "txtName":
            case "txtPass":
               DATACENTER.Player.login = eval(sel)._parent.txtName.text;
               DATACENTER.Player.password = eval(sel)._parent.txtPass.text;
               AKS.connect(SERVER_NAME,SERVER_PORT);
               break;
            case "txtConsole":
               if(eval(sel).text.length != 0)
               {
                  AKS.Console.process(eval(sel).text);
                  eval(sel).text = "";
                  this.justValidEnter = false;
               }
               break;
            case "txtZone":
               var txt = eval(sel);
               var wispBox = txt._parent._parent;
               if(txt.text.length != 0)
               {
                  AKS.Chat.send(txt.text,wispBox.to);
               }
               wispBox.removeMovieClip();
               break;
            default:
               trace("on est dans : " + selName);
         }
         return undefined;
      }
      if(Selection.getFocus() != undefined)
      {
         return undefined;
      }
      if(Key.isDown(32))
      {
         INTERFACE.UIInterfaceBanner.showNextSpellTab();
      }
      if(Key.isDown(65))
      {
         INTERFACE.UIInterfaceBanner.showPanel("Inventory");
      }
      if(Key.isDown(73))
      {
         INTERFACE.UIInterfaceBanner.showPanel("Inventory");
      }
      if(Key.isDown(67))
      {
         INTERFACE.UIInterfaceBanner.showPanel("Inventory");
      }
      if(Key.isDown(83))
      {
         INTERFACE.UIInterfaceBanner.showPanel("Spells");
      }
      if(Key.isDown(66) || Key.isDown(222))
      {
         KERNEL.switchToCC(DATACENTER.Player.CCData);
      }
      if(Key.isDown(16))
      {
         if(Key.isDown(49))
         {
            BATTLEFIELD.Container.show("Grid");
         }
         if(DEBUG_MODE)
         {
            if(Key.isDown(50))
            {
               BATTLEFIELD.Container.show("Ground1");
            }
            if(Key.isDown(51))
            {
               BATTLEFIELD.Container.show("Ground2");
            }
            if(Key.isDown(52))
            {
               BATTLEFIELD.Container.show("Selection");
            }
            if(Key.isDown(53))
            {
               BATTLEFIELD.Container.show("Object");
            }
            if(Key.isDown(54))
            {
               BATTLEFIELD.Container.show("Effect");
            }
            if(Key.isDown(55))
            {
               for(var a in BATTLEFIELD.Characters.list)
               {
                  BATTLEFIELD.Characters.list[a].setVisible(!BATTLEFIELD.Characters.list[a].sprite._visible);
               }
            }
            if(Key.isDown(56))
            {
               BATTLEFIELD.Container.show("Interaction");
            }
            if(Key.isDown(57))
            {
               INTERFACE._visible = !INTERFACE._visible;
            }
            if(Key.isDown(58))
            {
               BATTLEFIELD._visible = !BATTLEFIELD._visible;
            }
         }
      }
      else
      {
         if(Key.isDown(49))
         {
            INTERFACE.UIInterfaceBanner.banner.us1.container.onRelease();
         }
         if(Key.isDown(50))
         {
            INTERFACE.UIInterfaceBanner.banner.us2.container.onRelease();
         }
         if(Key.isDown(51))
         {
            INTERFACE.UIInterfaceBanner.banner.us3.container.onRelease();
         }
         if(Key.isDown(52))
         {
            INTERFACE.UIInterfaceBanner.banner.us4.container.onRelease();
         }
         if(Key.isDown(53))
         {
            INTERFACE.UIInterfaceBanner.banner.us5.container.onRelease();
         }
         if(Key.isDown(54))
         {
            INTERFACE.UIInterfaceBanner.banner.us6.container.onRelease();
         }
         if(Key.isDown(55))
         {
            INTERFACE.UIInterfaceBanner.banner.us7.container.onRelease();
         }
         if(Key.isDown(56))
         {
            INTERFACE.UIInterfaceBanner.banner.us8.container.onRelease();
         }
      }
      if(DEBUG_MODE)
      {
         if(Key.isDown(96))
         {
            INTERFACE.UIInterfaceBanner.showPanel("PlayerInfos");
            INTERFACE.UIInterfaceBanner.panels.PlayerInfos.setParams(DATACENTER.Player.data);
            INTERFACE.Text.setTextTimer("0",2000);
         }
         if(Key.isDown(97))
         {
            BATTLEFIELD.Interaction.setEnabled(true);
            INTERFACE.Text.setTextTimer("set enabled false",2000);
         }
         if(Key.isDown(98))
         {
            BATTLEFIELD.Interaction.setType("move");
            INTERFACE.Text.setTextTimer("move",2000);
         }
         if(Key.isDown(99))
         {
            BATTLEFIELD.Interaction.setType("spell");
            INTERFACE.Text.setTextTimer("spell",2000);
         }
         if(Key.isDown(100))
         {
            BATTLEFIELD.Characters.list[a];
         }
         if(Key.isDown(101))
         {
            for(var a in BATTLEFIELD.Characters.list)
            {
               BATTLEFIELD.Characters.list[a].setVisible(!BATTLEFIELD.Characters.list[a].setAnim("shoot"));
            }
            INTERFACE.Text.setTextTimer("shoot",2000);
         }
         if(Key.isDown(102))
         {
            for(var a in BATTLEFIELD.Characters.list)
            {
               BATTLEFIELD.Characters.list[a].setVisible(!BATTLEFIELD.Characters.list[a].setAnim("cast"));
            }
            INTERFACE.Text.setTextTimer("cast",2000);
         }
         if(Key.isDown(103))
         {
            for(var a in BATTLEFIELD.Characters.list)
            {
               BATTLEFIELD.Characters.list[a].setVisible(!BATTLEFIELD.Characters.list[a].setAnim("die"));
            }
            INTERFACE.Text.setTextTimer("die",2000);
         }
         if(Key.isDown(104))
         {
            for(var a in BATTLEFIELD.Characters.list)
            {
               BATTLEFIELD.Characters.list[a].setVisible(!BATTLEFIELD.Characters.list[a].setAnim("hit"));
            }
            INTERFACE.Text.setTextTimer("hit",2000);
         }
         if(Key.isDown(105))
         {
            DATACENTER.Player.data.weaponID += 1000;
            INTERFACE.Text.setTextTimer("Weapon : " + DATACENTER.Player.data.weaponID,2000);
         }
         if(Key.isDown(110))
         {
            DATACENTER.Player.data.weaponID -= 1000;
            INTERFACE.Text.setTextTimer("Weapon : " + DATACENTER.Player.data.weaponID,2000);
         }
         if(Key.isDown(107))
         {
            BATTLEFIELD.Container.zoom(10);
         }
         if(Key.isDown(109))
         {
            BATTLEFIELD.Container.zoom(-10);
         }
         if(Key.isDown(111))
         {
            BATTLEFIELD.Container.setColor(true);
            INTERFACE.Text.setTextTimer("Nuit",2000);
         }
         if(Key.isDown(106))
         {
            BATTLEFIELD.Container.setColor(false);
            INTERFACE.Text.setTextTimer("Jour",2000);
         }
         if(Key.isDown(36))
         {
            INTERFACE.showFps();
         }
         if(Key.isDown(35))
         {
            INTERFACE.hideFps();
         }
      }
   };
   this.setEnabled(true);
};
Class_KeyListener.prototype.setEnabled = function(bool)
{
   if(bool)
   {
      Key.addListener(this);
   }
   else
   {
      Key.removeListener(this);
   }
};
