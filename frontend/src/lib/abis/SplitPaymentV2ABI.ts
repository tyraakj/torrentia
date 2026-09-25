export const SPLIT_PAYMENT_V2_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_registry",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "CLAIM_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "SETTLEMENT_GRACE_PERIOD",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint48",
        "internalType": "uint48"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimedChunksBitmap",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "openSession",
    "inputs": [
      {
        "name": "sessionId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "modelId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "serviceDeadline",
        "type": "uint48",
        "internalType": "uint48"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "reclaimUnspent",
    "inputs": [
      {
        "name": "sessionId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registry",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract ModelRegistry"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "sessions",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "downloader",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "modelId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "deposit",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalClaimed",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "serviceDeadline",
        "type": "uint48",
        "internalType": "uint48"
      },
      {
        "name": "settlementDeadline",
        "type": "uint48",
        "internalType": "uint48"
      },
      {
        "name": "closed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "settleBatch",
    "inputs": [
      {
        "name": "sessionId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "claims",
        "type": "tuple[]",
        "internalType": "struct SplitPaymentV2.ChunkPaymentClaim[]",
        "components": [
          {
            "name": "sessionId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "chunkIndex",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "chunkHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "seeder",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "deadline",
            "type": "uint48",
            "internalType": "uint48"
          }
        ]
      },
      {
        "name": "signatures",
        "type": "bytes[]",
        "internalType": "bytes[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "BatchSettled",
    "inputs": [
      {
        "name": "sessionId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "seeder",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "chunkCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalSeederAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalCreatorAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SessionClosed",
    "inputs": [
      {
        "name": "sessionId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "downloader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "refundedAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SessionOpened",
    "inputs": [
      {
        "name": "sessionId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "downloader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "modelId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "deposit",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "serviceDeadline",
        "type": "uint48",
        "indexed": false,
        "internalType": "uint48"
      },
      {
        "name": "settlementDeadline",
        "type": "uint48",
        "indexed": false,
        "internalType": "uint48"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ArrayLengthMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ChunkAlreadyClaimed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ClaimExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EmptyBatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientDeposit",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidChunkHash",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidModelId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidRegistryAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSeeder",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSessionId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SessionAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SessionExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SessionNotActive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Unauthorized",
    "inputs": []
  }
] as const;
