package tracker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	PresenceTTL = 60 * time.Second
)

// RedisTracker implements SeederTracker backed by Redis for multi-instance deployments.
type RedisTracker struct {
	client *redis.Client
}

type PeerMetadata struct {
	Address  string `json:"address"`
	LastSeen int64  `json:"lastSeen"`
}

// NewRedisTracker initializes a Redis-backed tracker from a connection URL.
func NewRedisTracker(redisURL string) (*RedisTracker, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	return &RedisTracker{client: client}, nil
}

// NewRedisTrackerWithClient initializes a RedisTracker with an existing redis.Client.
func NewRedisTrackerWithClient(client *redis.Client) *RedisTracker {
	return &RedisTracker{client: client}
}

// Close terminates the Redis client connection.
func (r *RedisTracker) Close() error {
	return r.client.Close()
}

// Announce records a seeder's presence and held chunks in Redis.
func (r *RedisTracker) Announce(modelId, peerId, address string, chunksHeld []uint32) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = r.AnnounceContext(ctx, modelId, peerId, address, chunksHeld)
}

// AnnounceContext records presence with context propagation.
func (r *RedisTracker) AnnounceContext(ctx context.Context, modelId, peerId, address string, chunksHeld []uint32) error {
	now := time.Now().Unix()

	peerMeta := PeerMetadata{
		Address:  address,
		LastSeen: now,
	}
	metaJSON, err := json.Marshal(peerMeta)
	if err != nil {
		return err
	}

	pipe := r.client.Pipeline()

	// 1. Peer metadata key: presence:peer:{peerId}
	peerKey := fmt.Sprintf("presence:peer:%s", peerId)
	pipe.Set(ctx, peerKey, metaJSON, PresenceTTL)

	// 2. Model seeders sorted set: presence:model:{modelId}:seeders -> score = timestamp, member = peerId
	modelSeedersKey := fmt.Sprintf("presence:model:%s:seeders", modelId)
	pipe.ZAdd(ctx, modelSeedersKey, redis.Z{
		Score:  float64(now),
		Member: peerId,
	})

	// 3. Track models this peer is seeding: presence:peer_models:{peerId}
	peerModelsKey := fmt.Sprintf("presence:peer_models:%s", peerId)
	pipe.SAdd(ctx, peerModelsKey, modelId)
	pipe.Expire(ctx, peerModelsKey, PresenceTTL)

	// 4. Chunk indices set: presence:chunks:{modelId}:{peerId}
	chunksKey := fmt.Sprintf("presence:chunks:%s:%s", modelId, peerId)
	pipe.Del(ctx, chunksKey)

	if len(chunksHeld) > 0 {
		members := make([]interface{}, len(chunksHeld))
		for i, c := range chunksHeld {
			members[i] = strconv.FormatUint(uint64(c), 10)
		}
		pipe.SAdd(ctx, chunksKey, members...)
		pipe.Expire(ctx, chunksKey, PresenceTTL)
	}

	_, err = pipe.Exec(ctx)
	if err != nil {
		slog.Error("redis announce pipeline failed", "peerId", peerId, "modelId", modelId, "err", err)
	}
	return err
}

// Query fetches active seeders and chunks for modelId from Redis.
func (r *RedisTracker) Query(modelId string) []SeederDTO {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	res, err := r.QueryContext(ctx, modelId)
	if err != nil {
		slog.Error("redis query failed", "modelId", modelId, "err", err)
		return []SeederDTO{}
	}
	return res
}

// QueryContext performs the model query with context propagation.
func (r *RedisTracker) QueryContext(ctx context.Context, modelId string) ([]SeederDTO, error) {
	now := time.Now().Unix()
	minScore := strconv.FormatInt(now-int64(PresenceTTL.Seconds()), 10)

	modelSeedersKey := fmt.Sprintf("presence:model:%s:seeders", modelId)

	// 1. Fetch active peer IDs (score >= now - 60s)
	peerIDs, err := r.client.ZRangeByScore(ctx, modelSeedersKey, &redis.ZRangeBy{
		Min: minScore,
		Max: "+inf",
	}).Result()
	if err != nil {
		return nil, err
	}

	if len(peerIDs) == 0 {
		return []SeederDTO{}, nil
	}

	// 2. Fetch metadata and chunks for each active peer in pipeline
	pipe := r.client.Pipeline()
	metaCmds := make(map[string]*redis.StringCmd, len(peerIDs))
	chunkCmds := make(map[string]*redis.StringSliceCmd, len(peerIDs))

	for _, pid := range peerIDs {
		peerKey := fmt.Sprintf("presence:peer:%s", pid)
		metaCmds[pid] = pipe.Get(ctx, peerKey)

		chunksKey := fmt.Sprintf("presence:chunks:%s:%s", modelId, pid)
		chunkCmds[pid] = pipe.SMembers(ctx, chunksKey)
	}

	_, _ = pipe.Exec(ctx)

	results := make([]SeederDTO, 0, len(peerIDs))
	for _, pid := range peerIDs {
		var meta PeerMetadata
		if metaRaw, err := metaCmds[pid].Result(); err == nil {
			_ = json.Unmarshal([]byte(metaRaw), &meta)
		}

		var chunks []uint32
		if chunkStrs, err := chunkCmds[pid].Result(); err == nil {
			chunks = make([]uint32, 0, len(chunkStrs))
			for _, cs := range chunkStrs {
				if u, err := strconv.ParseUint(cs, 10, 32); err == nil {
					chunks = append(chunks, uint32(u))
				}
			}
		}

		results = append(results, SeederDTO{
			PeerID:     pid,
			Address:    meta.Address,
			ChunksHeld: chunks,
		})
	}

	return results, nil
}

// Heartbeat refreshes TTLs for peer presence and active models.
func (r *RedisTracker) Heartbeat(peerId string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = r.HeartbeatContext(ctx, peerId)
}

// HeartbeatContext executes heartbeat with context propagation.
func (r *RedisTracker) HeartbeatContext(ctx context.Context, peerId string) error {
	now := time.Now().Unix()

	peerKey := fmt.Sprintf("presence:peer:%s", peerId)
	peerModelsKey := fmt.Sprintf("presence:peer_models:%s", peerId)

	models, err := r.client.SMembers(ctx, peerModelsKey).Result()
	if err != nil {
		return err
	}

	pipe := r.client.Pipeline()
	pipe.Expire(ctx, peerKey, PresenceTTL)
	pipe.Expire(ctx, peerModelsKey, PresenceTTL)

	for _, modelId := range models {
		modelSeedersKey := fmt.Sprintf("presence:model:%s:seeders", modelId)
		pipe.ZAdd(ctx, modelSeedersKey, redis.Z{
			Score:  float64(now),
			Member: peerId,
		})
		chunksKey := fmt.Sprintf("presence:chunks:%s:%s", modelId, peerId)
		pipe.Expire(ctx, chunksKey, PresenceTTL)
	}

	_, err = pipe.Exec(ctx)
	return err
}

// RemovePeer purges all presence data and model registrations for a peer.
func (r *RedisTracker) RemovePeer(peerId string) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = r.RemovePeerContext(ctx, peerId)
}

// RemovePeerContext purges presence with context propagation.
func (r *RedisTracker) RemovePeerContext(ctx context.Context, peerId string) error {
	peerModelsKey := fmt.Sprintf("presence:peer_models:%s", peerId)
	models, _ := r.client.SMembers(ctx, peerModelsKey).Result()

	pipe := r.client.Pipeline()
	peerKey := fmt.Sprintf("presence:peer:%s", peerId)
	pipe.Del(ctx, peerKey)
	pipe.Del(ctx, peerModelsKey)

	for _, modelId := range models {
		modelSeedersKey := fmt.Sprintf("presence:model:%s:seeders", modelId)
		pipe.ZRem(ctx, modelSeedersKey, peerId)

		chunksKey := fmt.Sprintf("presence:chunks:%s:%s", modelId, peerId)
		pipe.Del(ctx, chunksKey)
	}

	_, err := pipe.Exec(ctx)
	return err
}

// Stats returns the active model count and unique seeders.
func (r *RedisTracker) Stats() (totalModels, totalSeeders int) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	models, seeders, _ := r.StatsContext(ctx)
	return models, seeders
}

// StatsContext computes stats with context propagation.
func (r *RedisTracker) StatsContext(ctx context.Context) (totalModels, totalSeeders int, err error) {
	// Find all presence:model:*:seeders keys
	iter := r.client.Scan(ctx, 0, "presence:model:*:seeders", 0).Iterator()
	uniqueSeedersMap := make(map[string]bool)
	modelCount := 0

	now := time.Now().Unix()
	minScore := strconv.FormatInt(now-int64(PresenceTTL.Seconds()), 10)

	for iter.Next(ctx) {
		modelKey := iter.Val()
		modelCount++

		peers, _ := r.client.ZRangeByScore(ctx, modelKey, &redis.ZRangeBy{
			Min: minScore,
			Max: "+inf",
		}).Result()
		for _, p := range peers {
			uniqueSeedersMap[p] = true
		}
	}

	if err := iter.Err(); err != nil {
		return 0, 0, err
	}

	return modelCount, len(uniqueSeedersMap), nil
}
