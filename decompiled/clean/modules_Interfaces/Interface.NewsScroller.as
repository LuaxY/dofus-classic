Class_Interface_NewsScroller = function()
{
   var _loc1_ = this;
   _loc1_.setSize(_loc1_._width,_loc1_._height);
};
Class_Interface_NewsScroller.prototype = new MovieClip();
Object.registerClass("Interface::NewsScroller",Class_Interface_NewsScroller);
Class_Interface_NewsScroller.prototype.setSize = function(w, h)
{
   var _loc1_ = this;
   _loc1_.width = w;
   _loc1_.height = h;
   _loc1_._xscale = _loc1_._yscale = 100;
   _loc1_.newsCount = 0;
};
Class_Interface_NewsScroller.prototype.loadXHML = function(file)
{
   var _loc2_ = this;
   var _loc1_ = new XML();
   _loc1_.ignoreWhite = true;
   _loc1_.parent = _loc2_;
   _loc1_.ignoreWhite = true;
   _loc1_.onLoad = function(success)
   {
      if(success)
      {
         this.parent.parseXML(this);
      }
      else
      {
         trace("Impossible d\'ouvir les news !!");
      }
   };
   _loc1_.load(file);
};
Class_Interface_NewsScroller.prototype.parseXML = function(doc)
{
   var _loc2_ = this;
   var child = doc.firstChild;
   var _loc1_;
   var news;
   var _loc3_ = 0;
   var newsClip;
   _loc2_.newsCount = 0;
   if(child.nodeName == "news")
   {
      _loc1_ = child.firstChild;
      while(_loc1_ != null)
      {
         news = _loc1_.childNodes;
         newsClip = _loc2_.News.attachMovie("Interface::NewsScrollerItem","news" + _loc3_,_loc3_,{newsXML:news,title:_loc1_.attributes.title,width:_loc2_.width,height:_loc2_.height,_y:- _loc2_.height});
         _loc1_ = _loc1_.nextSibling;
         _loc3_ = _loc3_ + 1;
      }
   }
   _loc2_.newsCount = _loc3_;
   _loc2_.slide();
};
Class_Interface_NewsScroller.prototype.slide = function()
{
   var _loc1_ = this;
   clearInterval(_loc1_.lastID);
   _loc1_.currentIndex = 0;
   _loc1_.slideNext();
   _loc1_.lastID = setInterval(_loc1_,"slideNext",NEWS_DELAY);
};
Class_Interface_NewsScroller.prototype.slideNext = function()
{
   var _loc1_ = this;
   _loc1_.showNews(_loc1_.currentIndex);
   _loc1_.currentIndex = _loc1_.currentIndex + 1;
   if(_loc1_.currentIndex >= _loc1_.newsCount)
   {
      _loc1_.currentIndex = 0;
   }
};
Class_Interface_NewsScroller.prototype.showNews = function(index)
{
   var _loc1_ = this;
   var oldNews = "news" + _loc1_.currNews;
   _loc1_.currNews = index;
   var newsName = "news" + index;
   _loc1_.News[newsName]._y = - _loc1_.height;
   _loc1_.News[oldNews]._y = 0;
   var i = 0;
   _loc1_.onEnterFrame = function()
   {
      var _loc1_ = this;
      i++;
      _loc1_.News[newsName]._y += i * i;
      _loc1_.News[oldNews]._y += i * i;
      if(_loc1_.News[newsName]._y >= 0)
      {
         _loc1_.News[newsName]._y = 0;
         delete _loc1_.onEnterFrame;
      }
   };
};
Class_Interface_NewsScroller.prototype.clear = function()
{
   var _loc1_ = this;
   clearInterval(_loc1_.lastID);
   delete _loc1_.onEnterFrame;
   for(var _loc2_ in _loc1_.News)
   {
      _loc1_.News[_loc2_].removeMovieClip();
   }
};
