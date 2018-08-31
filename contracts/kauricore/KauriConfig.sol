pragma solidity ^0.4.24;

import '../permissions/Administrable.sol';

/**
 * @title KauriConfig
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Configuration properties for KauriCore
 */
contract KauriConfig is Administrable {

    //Capping maximum contributions per request to avoid change of gas being exceeded during refund procress
    uint64 public maxContributions;

    //The time (in seconds) of the publication period, for which an article writer
    //can still claim a request bounty on publication, after the request deadline
    uint64 public publicationTimeout;

    //The minimum request deadline duration (in seconds)
    uint64 public minDeadlineDuration;

    //The maximum request deadline duration (in seconds)
    uint64 public maxDeadlineDuration;

    function setMaxContributions(uint64 _maxContributions) external onlyAdmin(5001) {
        maxContributions = _maxContributions;
    }

    function setPublicationTimeout(uint64 _publicationTimeout) external onlyAdmin(5002) {
        publicationTimeout = _publicationTimeout;
    }

    function setMinDeadlineDuration(uint64 _minDeadlineDuration) external onlyAdmin(5003) {
        minDeadlineDuration = _minDeadlineDuration;
    }

    function setMaxDeadlineDuration(uint64 _maxDeadlineDuration) external onlyAdmin(5004) {
        maxDeadlineDuration = _maxDeadlineDuration;
    }

}