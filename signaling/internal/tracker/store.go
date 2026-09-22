package tracker

import (
	"context"
)

// SeederTracker defines the unified tracking interface used by Hub and HTTP services.
type SeederTracker interface {
	Announce(modelId, peerId, address string, chunksHeld []uint32)
	Query(modelId string) []SeederDTO
	Heartbeat(peerId string)
	RemovePeer(peerId string)
	Stats() (totalModels, totalSeeders int)
	Close() error
}

// Close is a no-op for in-memory Tracker.
func (t *Tracker) Close() error {
	return nil
}

// Context-aware interface for distributed stores.
type DistributedPresenceStore interface {
	SeederTracker
	AnnounceContext(ctx context.Context, modelId, peerId, address string, chunksHeld []uint32) error
	QueryContext(ctx context.Context, modelId string) ([]SeederDTO, error)
	HeartbeatContext(ctx context.Context, peerId string) error
	RemovePeerContext(ctx context.Context, peerId string) error
	StatsContext(ctx context.Context) (totalModels, totalSeeders int, err error)
}
