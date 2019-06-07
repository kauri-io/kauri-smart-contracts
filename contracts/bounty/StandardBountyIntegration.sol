pragma solidity ^0.4.22;

import '../permissions/Administrable.sol';
import './standardbounties/StandardBountiesFactory.sol';
import './standardbounties/StandardBounty.sol';

/**
 * @title Standard Bounties Integration
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Functions that interact with the Standard Bounties contract
 */
contract StandardBountyIntegration is Administrable {

    StandardBountiesFactory standardBountiesFactory;

    function setStandardBountiesFactoryAddress(address standardBountiesFactoryAddress) 
                                               external 
                                               onlyAdmin(9001) {
        standardBountiesFactory = StandardBountiesFactory(standardBountiesFactoryAddress);
    }

    function createStandardBounty(string _contentHash, uint _deadline) internal returns (StandardBounty) {
        return StandardBounty(standardBountiesFactory.createBounty(address(this), 0x0, _contentHash, _deadline));
    }

    function contributeToBounty(address _bountyAddress, 
                                uint _bountyAmount) 
                                internal {
        require(_bountyAddress.call.value(msg.value).gas(5000)());
    }

    function drainBounty(address _bountyAddress, 
                         address _fundsAddress) 
                         internal {
        StandardBounty bounty = StandardBounty(_bountyAddress);

        StandardToken[] memory tokens = new StandardToken[](1);
        tokens[0] = StandardToken(address(0));
        bounty.drainBounty(tokens);
        _fundsAddress.transfer(address(this).balance);
    }

    function fulfillAndAcceptBounty(address _bountyAddress, 
                                    string _articleContentHash,  
                                    address _fulfillerAddress) 
                                    internal {
        StandardBounty bounty = StandardBounty(_bountyAddress);

        address[] memory fulfillers = new address[](1);
        uint[] memory numerators = new uint[](1);
        uint[] memory amounts = new uint[](1);
        StandardToken[] memory tokens = new StandardToken[](1);

        fulfillers[0] = address(_fulfillerAddress);
        numerators[0] = 1;
        amounts[0] = bounty.balance;
        tokens[0] = StandardToken(address(0));

        bounty.fulfillAndAccept(fulfillers, numerators, 1, _articleContentHash, tokens, amounts);
    }

    function changeBountyData(address _bountyAddress,
                              string _newData)
                              internal {
        StandardBounty bounty = StandardBounty(_bountyAddress);
        bounty.changeData(_newData);
    }

    function getBountyValue(address _bountyAddress)
                             internal
                             view
                             returns (uint) {
        return _bountyAddress.balance;
    }
}