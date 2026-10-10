MovieClip.prototype.drawArc = function(x, y, radius, arc, startAngle, yRadius)
{
   var _loc2_;
   var _loc1_;
   var _loc3_;
   if(arguments.length >= 5)
   {
      if(yRadius == undefined)
      {
         yRadius = radius;
      }
      var segAngle;
      var angleMid;
      var segs;
      var ax;
      var ay;
      var bx;
      var by;
      var cx;
      var cy;
      if(Math.abs(arc) > 360)
      {
         arc = 360;
      }
      segs = Math.ceil(Math.abs(arc) / 45);
      segAngle = arc / segs;
      _loc2_ = (- segAngle / 180) * 3.141592653589793;
      _loc1_ = (- startAngle / 180) * 3.141592653589793;
      ax = x - Math.cos(_loc1_) * radius;
      ay = y - Math.sin(_loc1_) * yRadius;
      if(segs > 0)
      {
         _loc3_ = 0;
         while(_loc3_ < segs)
         {
            _loc1_ += _loc2_;
            angleMid = _loc1_ - _loc2_ / 2;
            bx = ax + Math.cos(_loc1_) * radius;
            by = ay + Math.sin(_loc1_) * yRadius;
            cx = ax + Math.cos(angleMid) * (radius / Math.cos(_loc2_ / 2));
            cy = ay + Math.sin(angleMid) * (yRadius / Math.cos(_loc2_ / 2));
            this.curveTo(cx,cy,bx,by);
            _loc3_ = _loc3_ + 1;
         }
      }
      return {x:bx,y:by};
   }
};
