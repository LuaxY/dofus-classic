this._quality = "high";
Stage.scaleMode = "noScale";
Stage.showMenu = false;
Stage.addListener(this);
_global.ROOT = this;
this.menu.swapDepths(300);
this.marque.swapDepths(301);
this.ouvrirRubrique = function(url, params)
{
   this.saveRubrique = url;
   this.saveParams = params;
   var container = this.createEmptyMovieClip("rubrique",100);
   var loading = this.attachMovie("LoadingSymbol","loading",1000,{_x:550,_y:220});
   loading.onLoadingEnd = function()
   {
      trace("CHARGEMENT TERMINEE ON SOCCUPE DES PARAMETRES");
      var params = ROOT.getParams();
      if(params.page != undefined)
      {
         ROOT.rubrique.gotoAndStop(params.page);
      }
      this.removeMovieClip();
   };
   loading.setLoadingTarget(container,url);
   container.loadMovie(url);
};
this.getParams = function()
{
   var tmp = this.saveParams;
   delete this.saveParams;
   return tmp;
};
this.ouvrirRubrique("Rubriques/Accueil/Accueil.swf");
this.createEmptyMovieClip("nuages",10);
this.ciel.duplicateMovieClip("maskCiel",20);
this.maskciel._height -= 1;
this.nuages.setMask(this.maskCiel);
this.nuages.ajouteNuage = function(x)
{
   var i = 0;
   while(this["nuage" + i])
   {
      i++;
   }
   var nuage = this.attachMovie("Nuage" + random(2),"nuage" + i,i);
   nuage._x = x;
   nuage._xscale = nuage._yscale = random(40) + 80;
   if(random(2) == 1)
   {
      nuage._xscale *= -1;
   }
   var b = this._parent.ciel.getBounds(this._parent);
   nuage._y = b.Ymin + random(b.Ymax - b.Ymin);
   return i;
};
this.nuages._onEnterFrame = function()
{
   if(this.cnt++ % 2 == 0)
   {
      var nuage;
      for(var a in this)
      {
         nuage = this[a];
         if(nuage.__proto__ == MovieClip.prototype)
         {
            nuage._x -= 0.3;
            if(nuage._x < this.limGauche - nuage._width)
            {
               nuage.removeMovieClip();
               this.ajouteNuage(Stage.width + this.limGauche + 50);
            }
         }
      }
   }
};
this.nuages.activate = function(bool)
{
   if(bool)
   {
      this.onEnterFrame = this._onEnterFrame;
   }
   else
   {
      delete this.onEnterFrame;
   }
};
this.nuages.activate(true);
this.nuages.enleverNuages = function()
{
   for(var a in this)
   {
      this[a].removeMovieClip();
   }
};
this.onResize = function()
{
   this.nuages.enleverNuages();
   var width = Stage.width;
   this.ciel._width = width;
   this.maskCiel._width = width;
   this.maskBackg._width = width;
   var limGauche = (- (width - 750)) / 2;
   this.nuages.limGauche = limGauche;
   var nbrNuage = width / 200;
   var limDroite = 750 + (width - 750) / 2;
   var dist = limDroite - limGauche;
   var ecart = dist / nbrNuage;
   var i = 0;
   while(i < nbrNuage)
   {
      var x = i * ecart + limGauche;
      i = this.nuages.ajouteNuage(x);
   }
};
this.onResize();
this.loadXML = function()
{
   var data = new XML();
   data.onLoad = function()
   {
      ROOT.BGArray = new Array();
      ROOT.BGfolder = this.firstChild.attributes.FOLDER;
      var node = this.firstChild.firstChild;
      while(node != null)
      {
         ROOT.BGArray.push(node.attributes.FILE);
         node = node.nextSibling;
      }
      ROOT.loadRandomBackGround();
   };
   data.ignoreWhite = true;
   data.load("Backgrounds/liste.xml");
};
this.loadXML();
this.loadRandomBackGround = function()
{
   this.createEmptyMovieClip("backg",30);
   this.backg._alpha = 0;
   this.backg.onInitFrame = function()
   {
      this.onEnterFrame = function()
      {
         this._alpha += 20;
         if(this._alpha >= 100)
         {
            delete this.onEnterFrame;
         }
      };
   };
   this.backg.loadMovie(ROOT.BGfolder + ROOT.BGArray[random(ROOT.BGArray.length)]);
};
this.removeRandomBackGround = function()
{
   this.backg.onEnterFrame = function()
   {
      this._alpha -= 20;
      if(this._alpha <= 0)
      {
         this.removeMovieClip();
      }
   };
};
MovieClip.prototype.moveFromScreenLeft = function()
{
   this.savex = this._x;
   this._x = - (Stage.width - 750) / 2 - this._width;
   this.speed = (this._savex - this._x) / 3;
   this.onEnterFrame = function()
   {
      if(this._x + this.speed >= this.savex)
      {
         this._x = this.savex;
         delete this.onEnterFrame;
      }
      else
      {
         this._x += this.speed;
      }
   };
};
