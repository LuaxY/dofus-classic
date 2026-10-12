StatsBoxClass = function()
{
   this.update(this.rubrique,this.page);
};
StatsBoxClass.prototype = new MovieClip();
Object.registerClass("StatsBoxSymbol",StatsBoxClass);
StatsBoxClass.prototype.update = function(rubrique, page)
{
   getURL("javascript:if(typeof " + this.javaScriptFunction + " != \'undefined\') " + this.javaScriptFunction + "(\'" + rubrique + "\',\'" + page + "\');","");
};
ASSetPropFlags(StatsBoxClass.prototype,null,1,1);
