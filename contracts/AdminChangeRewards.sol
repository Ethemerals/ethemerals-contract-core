// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

interface IEthemerals {
  function changeRewards(uint _tokenId, uint32 offset, bool add, uint8 action) external;
}

contract EggHolderRewards {

  address private admin;
  IEthemerals private coreContract;

  constructor(address _ethemeralsAddress) {
    admin = msg.sender;
    coreContract = IEthemerals(_ethemeralsAddress);
  }

  function changeRewards(uint256[] memory tokenIndices, uint32 _bonus) external {// ADMIN
    require(msg.sender == admin, 'no');
    for (uint i = 0; i < tokenIndices.length; i++) {
      coreContract.changeRewards(tokenIndices[i], _bonus, true, 0);
    }
  }


}