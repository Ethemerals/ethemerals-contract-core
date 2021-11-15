// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/utils/math/SafeMath.sol"; // TODO
import "../openzep/utils/math/SafeMath.sol";

import "./IEthemerals.sol";

/**
 *
 * EthemeralLifeForceX Contract (The native token of Merals)
 * @dev Extends standard ERC20 contract
 */

contract EthemeralLifeForceX is Context, Ownable, ERC20Burnable {
  using SafeMath for uint256;

  // Public variables
  // uint256 public emissionStart;
  uint256 public emissionEnd;
  uint256 public emissionPerDay = 1 * (10 ** 18); // base 1 per day

  address private ethemeralsAddress;

  mapping(uint256 => uint256) private lastClaim;

  mapping(uint256 => uint256) emissionBySeason;

  // BonusMultiplier || if more > 1 else 1
  mapping (uint256 => uint8) private bonusMult;

  // BlackList || true then On the list
  mapping (uint256 => bool) private blackList;


  constructor(string memory name, string memory symbol, address _ethemeralsAddress, uint256 _emissionStart) ERC20(name, symbol) {
    _mint(msg.sender, 42000000 * 10**18);

    ethemeralsAddress = _ethemeralsAddress;
    emissionBySeason[0] = _emissionStart;
    emissionEnd = _emissionStart + (86400 * 365 * 4);  // for years
  }


  /**
    * @dev When accumulated ELFs have last been claimed for a Meral index
    */
  function getLastClaim(uint256 tokenIndex) public view returns (uint256) {
    uint256 lastClaimed = uint256(lastClaim[tokenIndex]) != 0 ? uint256(lastClaim[tokenIndex]) : emissionBySeason[tokenIndex.sub(1).div(1000)];
    return lastClaimed;
  }


  /**
    * @dev Accumulated ELF tokens for a Meral token index.
    */
  function accumulated(uint256 tokenIndex) public view returns (uint256) {
    uint256 lastClaimed = getLastClaim(tokenIndex);

    // Sanity check if last claim was on or after emission end
    if (lastClaimed >= emissionEnd) return 0;

    // Work out multiplier
    IEthemerals.Meral memory _meral = IEthemerals(ethemeralsAddress).getEthemeral(tokenIndex);
    uint8 _bonusMult = bonusMult[tokenIndex] > 1 ? bonusMult[tokenIndex] : 1; // has bonus?
    _bonusMult = blackList[tokenIndex] ? 0 : _bonusMult; // is blacklisted?
    uint256 multiplier = uint256((_meral.spd - _meral.spd / 2) + _meral.score).div(100).mul(_bonusMult); // score + 50% spd bnonus * bonus

    uint256 accumulationPeriod = block.timestamp < emissionEnd ? block.timestamp : emissionEnd; // Getting the min value of both

    uint256 totalAccumulated = accumulationPeriod.sub(lastClaimed).mul(emissionPerDay).div(86400).mul(multiplier);

    return totalAccumulated;
  }


  /**
    * @dev Claim mints ELFs and supports multiple Meral token indices at once.
    */
  function claim(uint256[] memory tokenIndices) external {

    uint256 totalClaimQty = 0;
    for (uint i = 0; i < tokenIndices.length; i++) {
      uint tokenIndex = tokenIndices[i];

      // Duplicate token index check
      for (uint j = i + 1; j < tokenIndices.length; j++) {
        require(tokenIndex != tokenIndices[j], "duplicate");
      }
      require(emissionBySeason[tokenIndex.sub(1).div(1000)] != 0, "not started");
      require(tokenIndex < IEthemerals(ethemeralsAddress).totalSupply(), "not minted");
      require(IEthemerals(ethemeralsAddress).ownerOf(tokenIndex) == msg.sender, "owner only");

      uint256 claimQty = accumulated(tokenIndex);

      if (claimQty != 0) {
        totalClaimQty = totalClaimQty.add(claimQty);
        lastClaim[tokenIndex] = block.timestamp;
      }

    }

    require(totalClaimQty != 0, "none accumulated");
    _mint(msg.sender, totalClaimQty);

    // EMIT EVENT
  }


  // ADMIN ONLY
  function setEmmisionBySeason(uint _season, uint _emissionStart) external onlyOwner() {// ADMIN
    emissionBySeason[_season] = _emissionStart;
  }

  function setBonusByIndexes(uint256[] memory tokenIndices, uint8 _bonus) external onlyOwner() {// ADMIN
    require(_bonus < 5, 'to high');
    for (uint i = 0; i < tokenIndices.length; i++) {
      bonusMult[tokenIndices[i]] = _bonus;
    }
  }

  function setBlackListByIndexes(uint256[] memory tokenIndices, bool _blacklist) external onlyOwner() {// ADMIN
    for (uint i = 0; i < tokenIndices.length; i++) {
      blackList[tokenIndices[i]] = _blacklist;
    }
  }


}