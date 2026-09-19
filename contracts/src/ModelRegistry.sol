// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title ModelRegistry
 * @notice On-chain registry for AI models distributed via the Torrentia P2P swarm.
 * @dev Stores immutable creator identity, uniform chunk price, IPFS manifest URI,
 *      and the creator-configured revenue split basis points.
 */
contract ModelRegistry {
    /// @notice Model metadata and monetization configuration
    struct Model {
        address originalCreator;
        string metadataURI;
        uint256 chunkPrice;
        uint16 creatorShareBps;
        uint32 chunkCount;
        bool active;
    }

    /// @notice Mapping from unique modelId (content/identity hash) to Model record
    mapping(bytes32 => Model) public models;

    // Events
    event ModelRegistered(
        bytes32 indexed modelId,
        address indexed creator,
        string metadataURI,
        uint256 chunkPrice,
        uint16 creatorShareBps,
        uint32 chunkCount
    );

    event ModelDeactivated(
        bytes32 indexed modelId,
        address indexed creator
    );

    // Custom Errors
    error ModelAlreadyExists(bytes32 modelId);
    error InvalidCreatorShareBps(uint16 creatorShareBps);
    error InvalidChunkPrice();
    error InvalidChunkCount();
    error EmptyMetadataURI();
    error ModelNotFound(bytes32 modelId);
    error UnauthorizedCaller(address caller);
    error ModelAlreadyInactive(bytes32 modelId);

    /**
     * @notice Registers a new AI model on-chain.
     * @dev Sets msg.sender as the immutable originalCreator.
     * @param modelId Unique identifier for the model (e.g. keccak256 hash)
     * @param metadataURI IPFS CID pointing to ChunkManifest JSON
     * @param chunkPrice Price in wei per chunk (uniform across all seeders)
     * @param creatorShareBps Creator revenue share in basis points (100–9900, e.g. 7000 = 70%)
     * @param chunkCount Total number of chunks in the model
     */
    function registerModel(
        bytes32 modelId,
        string calldata metadataURI,
        uint256 chunkPrice,
        uint16 creatorShareBps,
        uint32 chunkCount
    ) external {
        if (models[modelId].originalCreator != address(0)) {
            revert ModelAlreadyExists(modelId);
        }
        if (creatorShareBps < 100 || creatorShareBps > 9900) {
            revert InvalidCreatorShareBps(creatorShareBps);
        }
        if (chunkPrice == 0) {
            revert InvalidChunkPrice();
        }
        if (chunkCount == 0) {
            revert InvalidChunkCount();
        }
        if (bytes(metadataURI).length == 0) {
            revert EmptyMetadataURI();
        }

        models[modelId] = Model({
            originalCreator: msg.sender,
            metadataURI: metadataURI,
            chunkPrice: chunkPrice,
            creatorShareBps: creatorShareBps,
            chunkCount: chunkCount,
            active: true
        });

        emit ModelRegistered(
            modelId,
            msg.sender,
            metadataURI,
            chunkPrice,
            creatorShareBps,
            chunkCount
        );
    }

    /**
     * @notice Deactivates an existing model so new chunks cannot be purchased.
     * @dev Can only be called by the immutable originalCreator.
     * @param modelId The ID of the model to deactivate
     */
    function deactivateModel(bytes32 modelId) external {
        Model storage model = models[modelId];
        if (model.originalCreator == address(0)) {
            revert ModelNotFound(modelId);
        }
        if (model.originalCreator != msg.sender) {
            revert UnauthorizedCaller(msg.sender);
        }
        if (!model.active) {
            revert ModelAlreadyInactive(modelId);
        }

        model.active = false;

        emit ModelDeactivated(modelId, msg.sender);
    }

    /**
     * @notice Retrieves the full Model record for a given modelId.
     * @param modelId The ID of the model to query
     * @return Full Model struct
     */
    function getModel(bytes32 modelId) external view returns (Model memory) {
        return models[modelId];
    }
}
