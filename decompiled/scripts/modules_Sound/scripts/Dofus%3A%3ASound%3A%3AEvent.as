_global.BOUCLE_INFINIE = 9999;
_global.MUSIC_FIGHT = new Array("10.mp3","11.mp3","12.mp3","08.mp3");
SOMA.onGameStart = function()
{
   var _loc1_ = this.playSound("start_fight",undefined,2);
   _loc1_.onFinish = function()
   {
      SOMA.playMusic(MUSIC_FIGHT[random(MUSIC_FIGHT.length)],undefined,BOUCLE_INFINIE);
   };
};
SOMA.onGameEnd = function()
{
};
SOMA.onGameInvitation = function()
{
   this.playSound("bip");
};
SOMA.onGameCriticalHit = function()
{
   this.playSound("bip");
};
SOMA.onGameCriticalMiss = function()
{
   this.playSound("coup_critique");
};
SOMA.onGetCharacters = function()
{
   this.playMusic("02.mp3",undefined,BOUCLE_INFINIE);
};
SOMA.onEnterMulti = function()
{
   this.playMusic("07.mp3",undefined,BOUCLE_INFINIE);
};
SOMA.onChatWisper = function()
{
   this.playSound("bip");
};
SOMA.onError = function()
{
   this.playSound("error");
};
SOMA.onTotProut = function()
{
   this.playSound("pet");
};
SOMA.onEnterVillage = function()
{
   this.playMusic("04.mp3",undefined,BOUCLE_INFINIE);
};
