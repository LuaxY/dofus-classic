on(release){
   var spellData = this._parent.sBoost.container.getData();
   if(spellData.m_ID != undefined)
   {
      if(DATACENTER.Game.IsRunning)
      {
         INTERFACE.msgBox(getText("CANT_BOOST_IN_GAME"));
         return undefined;
      }
      if(DATACENTER.Player.data.bonusPoints < SPELL_BOOST_BONUS[spellData.m_Level])
      {
         INTERFACE.msgBox(getText("NOT_ENOUGTH_BONUSPOINTS"));
      }
      else
      {
         AKS.Spells.boost(spellData.m_ID);
         this._parent.initBoost();
      }
   }
}
