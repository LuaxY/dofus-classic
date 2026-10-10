Class_Compressor = function(string)
{
   this.init();
};
Object.registerClass("Dofus::Compressor",Class_Compressor);
Class_Compressor.prototype.init = function()
{
   var _loc2_ = this;
   _loc2_.hashCodes = new Object();
   _loc2_.ZipKey = new Array("_a","_b","_c","_d","_e","_f","_g","_h","_i","_j","_k","_l","_m","_n","_o","_p","_q","_r","_s","_t","_u","_v","_w","_x","_y","_z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","0","1","2","3","4","5","6","7","8","9","-","_");
   var _loc1_ = 0;
   while(_loc1_ < _loc2_.ZipKey.length)
   {
      _loc2_.hashCodes[_loc2_.ZipKey[_loc1_]] = _loc1_;
      _loc1_ = _loc1_ + 1;
   }
   _loc2_.zkArray = new Array("a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","0","1","2","3","4","5","6","7","8","9","-","_");
};
Class_Compressor.prototype.uncompressMap = function(mapId, name, width, height, bRolePlay, backgroundNum, data)
{
   DOFUS.t1 = getTimer();
   DATACENTER.Map = new Object();
   var mapDataObject = DATACENTER.Map;
   mapDataObject.id = mapId;
   mapDataObject.name = name;
   mapDataObject.width = Number(width);
   mapDataObject.height = Number(height);
   mapDataObject.bRolePlay = bRolePlay;
   mapDataObject.backgroundNum = backgroundNum;
   mapDataObject.data = new Array();
   log("ti :" + (getTimer() - DOFUS.t1));
   var i;
   var j;
   var k;
   var value;
   var length = data.length;
   var _loc2_;
   var _loc1_ = new Array();
   var c = DATACENTER.Clips;
   var dataObject;
   var _loc3_ = this.hashCodes;
   i = 0;
   while(i < length)
   {
      _loc1_ = data.substring(i,i + 10).split("");
      dataObject = new Object();
      _loc2_ = _loc1_[0] > "_" ? _loc3_["_" + _loc1_[0]] : _loc3_[_loc1_[0]];
      dataObject.active = !((_loc2_ & 0x20) >> 5) ? false : true;
      if(dataObject.active)
      {
         dataObject.lineOfSight = !(_loc2_ & 1) ? false : true;
         _loc2_ = _loc1_[1] > "_" ? _loc3_["_" + _loc1_[1]] : _loc3_[_loc1_[1]];
         dataObject.layerGroundRot = (_loc2_ & 0x30) >> 4;
         dataObject.groundLevel = _loc2_ & 0x0F;
         _loc2_ = _loc1_[2] > "_" ? _loc3_["_" + _loc1_[2]] : _loc3_[_loc1_[2]];
         dataObject.movement = (_loc2_ & 0x38) >> 3;
         _loc2_ = ((_loc2_ & 7) << 6) + (_loc1_[3] > "_" ? _loc3_["_" + _loc1_[3]] : _loc3_[_loc1_[3]]);
         dataObject.layerGroundNum = _loc2_;
         _loc2_ = _loc1_[4] > "_" ? _loc3_["_" + _loc1_[4]] : _loc3_[_loc1_[4]];
         dataObject.groundSlope = (_loc2_ & 0x3C) >> 2;
         dataObject.layerGroundFlip = !((octets[4] & 2) >> 1) ? false : true;
         _loc2_ = ((_loc2_ & 1) << 12) + ((_loc1_[5] > "_" ? _loc3_["_" + _loc1_[5]] : _loc3_[_loc1_[5]]) << 6) + (_loc1_[6] > "_" ? _loc3_["_" + _loc1_[6]] : _loc3_[_loc1_[6]]);
         dataObject.layerObject1Num = _loc2_;
         _loc2_ = _loc1_[7] > "_" ? _loc3_["_" + _loc1_[7]] : _loc3_[_loc1_[7]];
         dataObject.layerObject1Rot = (_loc2_ & 0x30) >> 4;
         dataObject.layerObject1Flip = !((_loc2_ & 8) >> 3) ? false : true;
         dataObject.layerObject2Flip = !((_loc2_ & 4) >> 2) ? false : true;
         dataObject.layerObject2Interactive = !((_loc2_ & 2) >> 1) ? false : true;
         _loc2_ = ((_loc2_ & 1) << 12) + ((_loc1_[8] > "_" ? _loc3_["_" + _loc1_[8]] : _loc3_[_loc1_[8]]) << 6) + (_loc1_[9] > "_" ? _loc3_["_" + _loc1_[9]] : _loc3_[_loc1_[9]]);
         dataObject.layerObject2Num = _loc2_;
      }
      mapDataObject.data.push(dataObject);
      i += 10;
   }
   log("décompress :" + (getTimer() - DOFUS.t1));
};
Class_Compressor.prototype.uncompressCell = function(cellNum, compressDataStr, maskHexStr)
{
   var _loc2_;
   var mapDataObject = DATACENTER.Map;
   var _loc1_ = compressDataStr.split("");
   var _loc3_ = parseInt(maskHexStr,16);
   var bActive = (_loc3_ & 0x2000) != 0;
   var bLineOfSite = (_loc3_ & 0x1000) != 0;
   var bMovement = (_loc3_ & 0x0800) != 0;
   var bGroundLevel = (_loc3_ & 0x0400) != 0;
   var bGroundSlope = (_loc3_ & 0x0200) != 0;
   var bLayerGroundNum = (_loc3_ & 0x0100) != 0;
   var bLayerGroundFilp = (_loc3_ & 0x80) != 0;
   var bLayerGroundRot = (_loc3_ & 0x40) != 0;
   var bLayerObject1Num = (_loc3_ & 0x20) != 0;
   var bLayerObject1Flip = (_loc3_ & 0x10) != 0;
   var bLayerObject1Rot = (_loc3_ & 8) != 0;
   var bLayerObject2Num = (_loc3_ & 4) != 0;
   var bLayerObject2Flip = (_loc3_ & 2) != 0;
   var bLayerObject2Interactive = (_loc3_ & 1) != 0;
   _loc2_ = 0;
   while(_loc2_ < _loc1_.length)
   {
      _loc1_[_loc2_] = this.decode64(_loc1_[_loc2_]);
      _loc2_ = _loc2_ + 1;
   }
   var dataObject = DATACENTER.Map.data[cellNum];
   if(bActive)
   {
      dataObject.active = !((_loc1_[0] & 0x20) >> 5) ? false : true;
   }
   if(bLineOfSite)
   {
      dataObject.lineOfSight = !(_loc1_[0] & 1) ? false : true;
   }
   if(bLayerGroundRot)
   {
      dataObject.layerGroundRot = (_loc1_[1] & 0x30) >> 4;
   }
   if(bLayerGroundLevel)
   {
      dataObject.groundLevel = _loc1_[1] & 0x0F;
   }
   if(bMovement)
   {
      dataObject.movement = (_loc1_[2] & 0x38) >> 3;
   }
   if(bLayerGroundNum)
   {
      dataObject.layerGroundNum = ((_loc1_[2] & 7) << 6) + _loc1_[3];
   }
   if(bLayerGroundSlope)
   {
      dataObject.groundSlope = (_loc1_[4] & 0x3C) >> 2;
   }
   if(bLayerGroundFlip)
   {
      dataObject.layerGroundFlip = !((_loc1_[4] & 2) >> 1) ? false : true;
   }
   if(bLayerObject1Num)
   {
      dataObject.layerObject1Num = ((_loc1_[4] & 1) << 12) + (_loc1_[5] << 6) + _loc1_[6];
   }
   if(bLayerObject1Rot)
   {
      dataObject.layerObject1Rot = (_loc1_[7] & 0x30) >> 4;
   }
   if(bLayerObject1Flip)
   {
      dataObject.layerObject1Flip = !((_loc1_[7] & 8) >> 3) ? false : true;
   }
   if(bLayerObject2Flip)
   {
      dataObject.layerObject2Flip = !((_loc1_[7] & 4) >> 2) ? false : true;
   }
   if(bLayerObject2Interactive)
   {
      dataObject.layerObject2Interactive = !((_loc1_[7] & 2) >> 1) ? false : true;
   }
   if(bLayerObject2Num)
   {
      dataObject.layerObject2Num = ((_loc1_[7] & 1) << 12) + (_loc1_[8] << 6) + _loc1_[9];
   }
};
Class_Compressor.prototype.decode64 = function(codedValue)
{
   var _loc1_ = codedValue;
   if(_loc1_ > "_")
   {
      return this.hashCodes["_" + _loc1_];
   }
   return this.hashCodes[_loc1_];
};
Class_Compressor.prototype.compressPath = function(dataArray)
{
   var _loc2_;
   var _loc1_;
   var _loc3_;
   if(dataArray != null)
   {
      var compressStr = new String();
      _loc2_ = 0;
      while(_loc2_ < dataArray.length)
      {
         _loc1_ = dataArray[_loc2_];
         _loc3_ = _loc1_.num >> 6 & 0x0F;
         _loc3_ += _loc1_.dir << 4;
         var octet2 = _loc1_.num & 0x3F;
         compressStr += this.zkArray[Number(_loc3_)];
         compressStr += this.zkArray[Number(octet2)];
         _loc2_ = _loc2_ + 1;
      }
      return compressStr;
   }
};
Class_Compressor.prototype.extractFullPath = function(compressedData)
{
   var _loc3_ = this;
   var lightArray = new Array();
   var _loc2_ = compressedData.split("");
   var _loc1_;
   _loc1_ = 0;
   while(_loc1_ < compressedData.length)
   {
      _loc2_[_loc1_] = _loc3_.decode64(_loc2_[_loc1_]);
      _loc2_[_loc1_ + 1] = _loc3_.decode64(_loc2_[_loc1_ + 1]);
      lightArray.push((_loc2_[_loc1_] & 0x0F) << 6 | _loc2_[_loc1_ + 1]);
      _loc1_ += 2;
   }
   return _loc3_.makeFullPath(lightArray);
};
Class_Compressor.prototype.makeFullPath = function(lightArray)
{
   var _loc1_ = new Array();
   var cellfrom;
   var _loc3_;
   var dir;
   var i;
   var _loc2_ = -1;
   var mapWidth = DATACENTER.Map.width;
   var nextDist = [mapWidth,mapWidth - 1,- mapWidth,- (mapWidth - 1)];
   var cellfrom = lightArray[0];
   i = 0;
   while(i < lightArray.length)
   {
      _loc3_ = lightArray[i];
      _loc1_[_loc2_ = _loc2_ + 1] = cellfrom;
      dir = KERNEL.PathFinding.getAbsoluteDirection(_loc3_,cellfrom,mapWidth);
      if(dir != -1)
      {
         while(_loc1_[_loc2_] != _loc3_)
         {
            _loc1_[_loc2_ = _loc2_ + 1] = _loc1_[_loc2_ - 1] + nextDist[dir];
         }
      }
      cellfrom = _loc3_;
      i++;
   }
   return _loc1_;
};
