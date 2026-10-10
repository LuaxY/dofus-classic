v = 5 + random(15);
va = 4 + random(5);
this.onEnterFrame = function()
{
   _X = _X - (v /= 1.4);
   _alpha = _alpha - va;
};
