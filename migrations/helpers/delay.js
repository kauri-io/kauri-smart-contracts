let delayTime = 0;

//Add a delay for rinkeby to overcome infura load balancing issue
//https://github.com/trufflesuite/truffle/issues/763
var init = function(networkId) {
 if (networkId == 4) {
  delayTime = 10000;
   }
}

var delay = function() {
    return new Promise(resolve => setTimeout(resolve, delayTime));
}

Object.assign(exports, {
  delay,
  init
 });
