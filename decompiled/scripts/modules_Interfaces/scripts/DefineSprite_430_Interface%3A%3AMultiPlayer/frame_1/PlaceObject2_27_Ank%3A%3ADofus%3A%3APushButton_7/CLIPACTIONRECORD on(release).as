on(release){
   var txt = this._parent.txtConsole;
   if(txt.text.length != 0)
   {
      AKS.Console.process(txt.text);
      txt.text = "";
   }
   Selection.setFocus("txtConsole");
}
