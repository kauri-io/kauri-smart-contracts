var fromAscii = function(str, padding) {
  var hex = '0x';
  for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      var n = code.toString(16);
      hex += n.length < 2 ? '0' + n : n;
  }
  return hex + '0'.repeat(padding*2 - hex.length + 2);
}

var toAscii = function(hex) {
  var str = '',
      i = 0,
      l = hex.length;
  if (hex.substr(0, 2) === '0x') {
      i = 2;
  }
  for (; i < l; i+=2) {
      var code = parseInt(hex.substr(i, 2), 16);
      if (code === 0) continue; // this is added
      str += String.fromCharCode(code);
  }
  return str;
}

Object.assign(exports, {
  fromAscii,
  toAscii
});
