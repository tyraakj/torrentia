package seeder_test

import (
	"path/filepath"
	"testing"
	"torrentia/signaling/internal/seeder"
)

func TestConfig_DefaultAndSaveLoad(t *testing.T) {
	tmpDir := t.TempDir()
	cfgPath := filepath.Join(tmpDir, "config.json")

	cfg := seeder.DefaultConfig()
	if cfg.ChainID != 10143 {
		t.Fatalf("expected ChainID 10143, got %d", cfg.ChainID)
	}
	if cfg.SplitPaymentContract != "0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa" {
		t.Fatalf("unexpected SplitPaymentContract: %s", cfg.SplitPaymentContract)
	}
	if cfg.ModelRegistryContract != "0xe2cEDee4817B11716728aed3C3d7AD0438813340" {
		t.Fatalf("unexpected ModelRegistryContract: %s", cfg.ModelRegistryContract)
	}

	cfg.SeederAddress = "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90"
	cfg.DataDir = tmpDir

	if err := seeder.SaveConfig(cfgPath, cfg); err != nil {
		t.Fatalf("failed to save config: %v", err)
	}

	loaded, err := seeder.LoadConfig(cfgPath)
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	if loaded.ChainID != cfg.ChainID || loaded.SeederAddress != cfg.SeederAddress || loaded.DataDir != cfg.DataDir {
		t.Fatalf("loaded config mismatch: %+v vs %+v", loaded, cfg)
	}
}

func TestConfig_Validation(t *testing.T) {
	cfg := seeder.DefaultConfig()
	cfg.SeederAddress = "invalid-address"
	if err := cfg.Validate(); err == nil {
		t.Fatalf("expected validation error for invalid address")
	}

	cfg.SeederAddress = "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90"
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected valid config, got: %v", err)
	}
}
