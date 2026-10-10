System.allowDomain("http://jouer.dofus.com");
System.allowDomain("http://dofus");
var url;
url = this._url.replace("%5C","/");
url = url.replace("\\","/");
var tmpArray2 = url.split("/");
tmpArray2.pop();
url = "";
var i = 0;
while(i < tmpArray2.length)
{
   url += tmpArray2[i] + "/";
   i++;
}
this.log._visible = false;
this.log.text = url + "\n" + this._url;
this._parent.funcloaded(url);
