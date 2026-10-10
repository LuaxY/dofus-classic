Class_InterfaceActionPoints = function()
{
};
Class_InterfaceActionPoints.prototype = new MovieClip();
Object.registerClass("Interface::ActionPoints",Class_InterfaceActionPoints);
Class_InterfaceActionPoints.prototype.setActionPoints = function(ap)
{
   this.txtActionPoints.text = ap;
};
