on(release){
   DOFUS.debug.login = DATACENTER.Player.login;
   DOFUS.debug.pass = DATACENTER.Player.password;
   DOFUS.debug.cid = DATACENTER.Player.ID;
   var len = DOFUS.debug.log.length;
   DOFUS.debug.log = DOFUS.debug.log.substring(len - 2000,len);
   DOFUS.debug.getURL(HTTP_BUG_REPORT,"_blank","POST");
}
