this.onFocus = function()
{
   AKS.Account.output = this;
   AKS.Account.getFriendsList();
};
this.onLostFocus = function()
{
   AKS.Account.output = undefined;
};
