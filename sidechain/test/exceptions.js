const PREFIX = "Returned error: VM Exception while processing transaction: ";

async function tryCatch(promise, message) {
    try {
        await promise;
        throw null;
    }
    catch (error) {
        
    }

};

module.exports = {
    catchRevert             : async function(promise) {await tryCatch(promise, "revert"             );},
    catchOutOfGas           : async function(promise) {await tryCatch(promise, "out of gas"         );},
    catchInvalidJump        : async function(promise) {await tryCatch(promise, "invalid JUMP"       );},
    catchInvalidOpcode      : async function(promise) {await tryCatch(promise, "invalid opcode"     );},
    catchStackOverflow      : async function(promise) {await tryCatch(promise, "stack overflow"     );},
    catchStackUnderflow     : async function(promise) {await tryCatch(promise, "stack underflow"    );},
    catchStaticStateChange  : async function(promise) {await tryCatch(promise, "revert"             );},
}
