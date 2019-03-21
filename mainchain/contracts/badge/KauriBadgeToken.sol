pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Token.sol';
import './KauriBadge.sol';

contract KauriBadgeToken is KauriBadge, ERC721Token {

    struct Badge {
        uint64 mintTime;
        uint64 typeId;
        uint128 serialNumber;
        bytes32 communityId;
    }

    Badge[] badges;
    mapping (bytes32 => uint128) badgeCount;

    function KauriBadgeToken() public ERC721Token("KauriBadge", "KAU") {
    }

    function mintBadge(address _owner, uint64 _typeId, bytes32 _communityId) external {
        bytes32 badgeCode = keccak256(_typeId, _communityId);

        badgeCount[badgeCode]++;

        Badge memory newBadge = Badge({
            mintTime: uint64(now),
            typeId: _typeId,
            serialNumber: badgeCount[badgeCode],
            communityId: _communityId
        });

        uint256 badgeId = badges.push(newBadge) - 1;
        _mint(_owner, badgeId);
    }
}