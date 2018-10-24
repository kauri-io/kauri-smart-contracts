let delayTime = 0;

//Add a delay for rinkeby to overcome infura load balancing issue
//https://github.com/trufflesuite/truffle/issues/763
var init = function(networkId) {
 if (networkId == 4) {
  delayTime = 5000;
   }
}

var delay = function(func) {
  return new Promise(resolve => setTimeout(resolve, delayTime))
      .then(func);
}

Object.assign(exports, {
  delay,
  init
 });