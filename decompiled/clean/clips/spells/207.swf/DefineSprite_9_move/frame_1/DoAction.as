xi = this._x;
yi = this._y;
nf = this._parent.level;
this.onEnterFrame = function()
{
   this._parent.attachMovie("fumee","fumee" + c,c + 10);
   var f = this._parent["fumee" + c];
   f._x = this._x;
   f._y = this._y;
   f.vx = this._x - xi + 20 * (Math.random() - 0.5);
   f.vy = this._y - yi + 20 * (Math.random() - 0.5);
   c++;
   xi = this._x;
   yi = this._y;
};
