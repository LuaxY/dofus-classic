String.prototype.replace = function(search, replace)
{
   var tmpStr = "";
   var tmpArray = this.split(search);
   var i = 0;
   while(i < tmpArray.length)
   {
      tmpStr += i != 0 ? replace + tmpArray[i] : tmpArray[i];
      i++;
   }
   this = tmpStr;
   return this;
};
