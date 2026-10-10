Class_Interface = function()
{
   this.init();
};
Class_Interface.prototype = new MovieClip();
Object.registerClass("Dofus::Interface",Class_Interface);
Class_Interface.prototype.onQuestionBoxNo = undefined;
Class_Interface.prototype.onQuestionBoxYes = undefined;
Class_Interface.prototype.init = function()
{
   var _loc1_ = this;
   _loc1_.createEmptyMovieClip("CommonLayer_mc",10);
   _loc1_.createEmptyMovieClip("BoxLayer_mc",20);
   _loc1_.createEmptyMovieClip("MainLayer_mc",30);
   _loc1_.layers = new Object();
   _loc1_.MainLayer_mc.attachMovie("Interface::Waiting","waiting",10,{_x:742});
   _loc1_.MainLayer_mc.attachMovie("Interface::Text","Text",20);
   _loc1_.Text = _loc1_.MainLayer_mc.Text;
   _loc1_.MainLayer_mc.attachMovie("Interface::BugReport","BugReport",30);
   _loc1_.MainLayer_mc.attachMovie("GlobalMask","Mask",40);
   _loc1_.listBox_sf = new FStyleFormat();
   _loc1_.listBox_sf.textFont = "Font3";
   _loc1_.listBox_sf.textColor = 16777215;
   _loc1_.listBox_sf.textDisabled = 5807827;
   _loc1_.listBox_sf.textSelected = 16777215;
   _loc1_.listBox_sf.embedFonts = true;
   _loc1_.listBox_sf.textSize = 8;
   _loc1_.comboBox_sf = new FStyleFormat();
   _loc1_.comboBox_sf.textFont = "Font3";
   _loc1_.comboBox_sf.textColor = 16777215;
   _loc1_.comboBox_sf.textDisabled = 5807827;
   _loc1_.comboBox_sf.textSelected = 16777215;
   _loc1_.comboBox_sf.embedFonts = true;
   _loc1_.comboBox_sf.textSize = 8;
   _loc1_.lastSpellcursorData = null;
};
Class_Interface.prototype.draw = function(symbol, depth)
{
   var _loc2_ = this;
   var _loc1_ = symbol.replace(":","");
   _loc2_.layers[_loc1_] = _loc2_.CommonLayer_mc.attachMovie(symbol,_loc1_,depth);
   INTERFACE["UI" + _loc1_] = _loc2_.CommonLayer_mc[_loc1_];
   return _loc2_.CommonLayer_mc[_loc1_];
};
Class_Interface.prototype.hide = function(clipSymbol)
{
   var _loc1_ = clipSymbol.replace(":","");
   this.layers[_loc1_].removeMovieClip();
   delete this.layers[_loc1_];
};
Class_Interface.prototype.clear = function()
{
   var _loc1_ = this;
   for(var _loc2_ in _loc1_.layers)
   {
      _loc1_.layers[_loc2_].removeMovieClip();
      delete _loc1_.layers[_loc2_];
   }
   _loc1_.hideToolTip();
   _loc1_.setCursor(null);
   _loc1_.setSpellCursor(null);
};
Class_Interface.prototype.drawLoginInterface = function()
{
   var _loc2_ = this;
   System.security.allowDomain(SITE_PATH);
   _loc2_.CommonLayer_mc.createEmptyMovieClip("loginInterface",1);
   var _loc1_ = _loc2_.CommonLayer_mc.loginInterface;
   _loc2_.UILoginInterface = _loc1_;
   _loc1_.onInitFrame = function()
   {
      this.onLogin = function(login, password)
      {
         DATACENTER.Player.login = login;
         DATACENTER.Player.password = password;
         AKS.connect(SERVER_NAME,SERVER_PORT);
      };
   };
   _loc1_.loadMovie(HTTP_LOGIN_PATH + "swf/" + LOGIN_INTERFACE_FILE + ".swf");
   _loc2_.layers.loginInterface = _loc1_;
};
Class_Interface.prototype.drawMenuInterface = function()
{
   var _loc2_ = this;
   System.security.allowDomain(SITE_PATH);
   _loc2_.CommonLayer_mc.attachMovie("UIStartMenu","MenuInterface",1);
   var _loc1_ = _loc2_.CommonLayer_mc.MenuInterface;
   _loc1_.setInfos([SITE_PATH]);
   _loc1_.onPlay = function()
   {
      AKS.Account.getCharacters();
   };
   _loc2_.layers.MenuInterface = _loc1_;
};
Class_Interface.prototype.drawAnimSelection = function(x, y)
{
   var _loc1_ = this.draw("AnimSelectionSymbol",4000);
   _loc1_._x = x;
   _loc1_._y = y;
   _loc1_._xscale = BATTLEFIELD.Container._xscale;
   _loc1_._yscale = BATTLEFIELD.Container._xscale;
};
Class_Interface.prototype.hideAnimSelection = function()
{
   this.hide("AnimSelectionSymbol");
};
Class_Interface.prototype.msgBox = function(msg)
{
   this.Text.clearText();
   this.BoxLayer_mc.attachMovie("Interface::WindowBox","boxMessage",10,{title:getText("INFORMATIONS"),containerSymbol:"boxMessage",containerParams:{msg:msg}});
};
Class_Interface.prototype.questionBox = function(msg)
{
   this.Text.clearText();
   this.BoxLayer_mc.attachMovie("Interface::WindowBox","boxYesNo",10,{title:getText("QUESTION"),containerSymbol:"boxYesNo",containerParams:{msg:msg}});
};
Class_Interface.prototype.wisperBox = function(to)
{
   this.Text.clearText();
   this.BoxLayer_mc.attachMovie("Interface::WindowBox","boxWhisper",10,{title:getText("WISPER_MESSAGE") + " " + getText("TO") + " " + to,containerSymbol:"boxWhisper",containerParams:{msg:msg,to:to}});
};
Class_Interface.prototype.optionsBox = function()
{
   this.Text.clearText();
   this.BoxLayer_mc.attachMovie("Interface::WindowBox","boxOptions",10,{title:getText("OPTIONS"),containerSymbol:"boxOptions",containerParams:{}});
};
Class_Interface.prototype.menuBox = function()
{
   this.Text.clearText();
   this.BoxLayer_mc.attachMovie("Interface::WindowBox","boxMenu",10,{title:getText("MENU"),containerSymbol:"boxMenu",containerParams:{}});
};
Class_Interface.prototype.hideQuestionBox = function()
{
   this.BoxLayer_mc.boxYesNo.removeMovieClip();
};
Class_Interface.prototype.messageNextTurn = function()
{
   this.BoxLayer_mc.attachMovie("Interface::NextTurn","nextTurnBoxClip",20,{_x:742,_y:432});
};
Class_Interface.prototype.hideMessageNextTurn = function()
{
   this.BoxLayer_mc.nextTurnBoxClip.removeMovieClip();
};
Class_Interface.prototype.showProgressBar = function(text)
{
   this.MainLayer_mc.attachMovie("Interface::ProgressBar","progressBar",60);
   var _loc2_ = Stage.width / 2;
   var _loc1_ = Stage.height / 2;
   this.MainLayer_mc.progressBar.init(150,11,_loc2_,_loc1_,text);
};
Class_Interface.prototype.updateProgressBar = function(value, max)
{
   this.MainLayer_mc.progressBar.update(value,max);
};
Class_Interface.prototype.hideProgressBar = function()
{
   this.MainLayer_mc.progressBar.removeMovieClip();
};
Class_Interface.prototype.setCursor = function(icon)
{
   var _loc1_ = this;
   if(icon != null)
   {
      _loc1_.MainLayer_mc.attachMovie("Interface::Cursor","cursor",70,{iconFile:icon});
   }
   else
   {
      _loc1_.MainLayer_mc.cursor.removeMovieClip();
   }
   return _loc1_.MainLayer_mc.cursor;
};
Class_Interface.prototype.getCursor = function()
{
   return this.MainLayer_mc.cursor;
};
Class_Interface.prototype.setSpellCursor = function(itemData)
{
   var _loc1_ = this;
   var _loc3_;
   if(itemData != null)
   {
      _loc1_.spellcursor = _loc1_.MainLayer_mc.createEmptyMovieClip("spellcursor",80);
      _loc1_.MainLayer_mc.spellcursor.createEmptyMovieClip("icon",10);
      _loc1_.MainLayer_mc.spellcursor.data = itemData;
      _loc3_ = _loc1_.MainLayer_mc.spellcursor.icon;
      _loc3_._alpha = 60;
      _loc3_.onInitFrame = function()
      {
         var _loc2_ = this;
         var _loc1_ = _loc2_.getBounds();
         _loc2_._x = - _loc1_.xMin - (_loc1_.xMax - _loc1_.xMin) / 2;
         _loc2_._y = - _loc1_.yMin - (_loc1_.yMax - _loc1_.yMin) / 2;
         _loc2_._parent.startDrag(true);
      };
      _loc3_.loadMovie(itemData.iconFile);
   }
   else
   {
      _loc1_.lastSpellcursorData = _loc1_.spellcursor.data;
      _loc1_.MainLayer_mc.spellcursor.removeMovieClip();
   }
};
Class_Interface.prototype.getSpellCursor = function()
{
   return this.MainLayer_mc.spellcursor;
};
Class_Interface.prototype.drawToolTip = function(text, x, y, bMouseOrigine, bCenter, interval, bTopAlign)
{
   this.MainLayer_mc.attachMovie("Interface::ToolTip","tooltip",9000);
   this.MainLayer_mc.toolTip.setText(text,x,y,bMouseOrigine,bCenter,interval,bTopAlign);
};
Class_Interface.prototype.hideToolTip = function()
{
   this.MainLayer_mc.toolTip.removeMovieClip();
};
Class_Interface.prototype.addToListener = function(clip)
{
   this.listenersArray.push(clip);
};
Class_Interface.prototype.removeAllListener = function()
{
   var _loc2_ = this;
   var _loc3_ = DATACENTER.Player.data;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.listenersArray.length)
   {
      _loc3_.removeListener(_loc2_.listenersArray[_loc1_]);
      _loc1_ = _loc1_ + 1;
   }
};
Class_Interface.prototype.drawTeamWatcher = function(team0, team1)
{
   this.attachMovie("Interface::TeamWatcher","teamWatcher",4700,{_x:371,_y:430});
   this.teamWatcher.setTeams(team0,team1);
};
Class_Interface.prototype.hideTeamWatcher = function()
{
   this.teamWatcher.removeMovieClip();
};
Class_Interface.prototype.showFps = function()
{
   this.attachMovie("fpsDetectorSymbol","fps",999999999);
};
Class_Interface.prototype.hideFps = function()
{
   this.fps.removeMovieClip();
};
