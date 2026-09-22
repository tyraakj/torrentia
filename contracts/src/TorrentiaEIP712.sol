// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Minimal self-contained EIP-712 verifier used when the vendored
/// OpenZeppelin cryptography package is not present in the Foundry checkout.
abstract contract TorrentiaEIP712 {
    bytes32 private immutable _hashedName;
    bytes32 private immutable _hashedVersion;
    bytes32 private constant _TYPE_HASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    constructor(string memory name, string memory version) {
        _hashedName = keccak256(bytes(name));
        _hashedVersion = keccak256(bytes(version));
    }

    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(_TYPE_HASH, _hashedName, _hashedVersion, block.chainid, address(this))
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function _recover(bytes32 digest, bytes memory signature) internal pure returns (address signer) {
        if (signature.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) v += 27;
        // Reject malleable signatures and invalid recovery identifiers.
        if (v != 27 && v != 28) return address(0);
        if (uint256(s) > 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0) {
            return address(0);
        }
        return ecrecover(digest, v, r, s);
    }
}
