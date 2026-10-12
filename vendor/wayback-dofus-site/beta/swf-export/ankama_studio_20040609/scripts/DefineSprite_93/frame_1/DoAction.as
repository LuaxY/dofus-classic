this.tabRubrique = new Array({nom:"News",son:"do"},{nom:"Presentation",son:"sol"},{nom:"Projets",son:"mi"},{nom:"Detente",son:"la"},{nom:"Atelier",son:"si"},{nom:"Labo",son:"la"},{nom:"Liens",son:"sol"},{nom:"Contact",son:"do"});
this.tabRubriqueActivate = new Array();
this.setBoutonRollOver = function(num)
{
   this.tabRubriqueActivate[num] = 1;
   var i = 0;
   while(i < this.tabRubrique.length)
   {
      if(this.tabRubriqueActivate[i] != 1)
      {
         return undefined;
      }
      i++;
   }
   this.tabRubriqueActivate = new Array();
};
var i = 0;
while(i < this.tabRubrique.length)
{
   var rubrique = this.tabRubrique[i].nom;
   var bouton = this["Bouton_" + rubrique];
   bouton.rubrique = rubrique;
   bouton.son = this.tabRubrique[i].son;
   bouton.num = i;
   bouton.stop();
   bouton.gw.gotoAndStop(bouton.gw._totalframes);
   bouton.fond.onRelease = function()
   {
      var rubrique = this._parent.rubrique;
      var url = "Rubriques/" + rubrique + "/" + rubrique + ".swf";
      ROOT.ouvrirRubrique(url,null);
      this._parent._parent.selectRubrique(rubrique);
   };
   bouton.fond.onRollOver = function()
   {
      this._parent._parent.setBoutonRollOver(this.num);
      this._parent.gotoAndStop(2);
   };
   bouton.fond.onRollOut = bouton.fond.onReleaseOutside = function()
   {
      if(this._parent.select != true)
      {
         this._parent.gotoAndStop(1);
      }
   };
   i++;
}
this.selectRubrique = function(rubrique)
{
   this.deselectionBouton();
   var bouton = this["Bouton_" + rubrique];
   this.selectionBouton(rubrique);
};
this.deselectionBouton = function()
{
   var i = 0;
   while(i < this.tabRubrique.length)
   {
      var rubrique = this.tabRubrique[i].nom;
      var bouton = this["Bouton_" + rubrique];
      bouton.select = false;
      bouton.gotoAndStop(1);
      i++;
   }
};
this.selectionBouton = function(rubrique)
{
   var bouton = this["Bouton_" + rubrique];
   bouton.gotoAndStop(2);
   bouton.select = true;
};
