class dofus.Translator
{
   function Translator()
   {
   }
   static function getText(key, args)
   {
      return _global.getText(key,args);
   }
   static function getGuildInfos(gid)
   {
      return _global.getGuildText(gid);
   }
   static function getSpellInfos(sid)
   {
      return _global.getSpellText(sid);
   }
}
