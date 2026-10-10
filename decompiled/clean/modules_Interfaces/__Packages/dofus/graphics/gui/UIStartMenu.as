class dofus.graphics.gui.UIStartMenu extends MovieClip
{
   function UIStartMenu()
   {
      super();
      this.initialize();
   }
   function initialize()
   {
      var _loc1_ = this;
      var _loc2_ = _global;
      _loc1_.title_txt.setText(dofus.Translator.getText("MENU_TITLE"),"Font2");
      _loc1_.onEnterFrame = function()
      {
         var _loc1_ = this;
         _loc1_.play_btn.setLabel(dofus.Translator.getText("MENU_PLAY"));
         _loc1_.download_btn.setLabel(dofus.Translator.getText("MENU_DOWNLOAD"));
         _loc1_.infos_btn.setLabel(dofus.Translator.getText("MENU_INFOS"));
         _loc1_.bug_btn.setLabel(dofus.Translator.getText("MENU_BUG"));
         _loc1_.instructions_btn.setLabel(dofus.Translator.getText("MENU_INSTRUCTIONS"));
         _loc1_.rules_btn.setLabel(dofus.Translator.getText("MENU_RULES"));
         delete _loc1_.onEnterFrame;
      };
      _loc1_.play_btn.onRelease = function()
      {
         _global.AKS.Account.getCharacters();
      };
      _loc1_.download_btn.onRelease = function()
      {
         this.getURL("javascript:winopen(\'http://" + _global.SITE_PATH + "/files/download/download.php\',700,590)");
      };
      _loc1_.infos_btn.onRelease = function()
      {
         this.getURL("javascript:winopen(\'http://" + _global.SITE_PATH + "/files/modifyAccount.php\',600,580)");
      };
      _loc1_.bug_btn.onRelease = function()
      {
         this.getURL("javascript:winopen(\'http://" + _global.SITE_PATH + "/files/bugreport/index.php\',500,360)");
      };
      _loc1_.instructions_btn.onRelease = function()
      {
         this.getURL("javascript:winopen(\'http://ankama.online.fr/dl/DofusGuideUtilisateur.pdf\',500,500)");
      };
      _loc1_.rules_btn.onRelease = function()
      {
         this.getURL("javascript:winopen(\'http://" + _global.SITE_PATH + "/files/charteBeta.php\',500,500)");
      };
   }
}
