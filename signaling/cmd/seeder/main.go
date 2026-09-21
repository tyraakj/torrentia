package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"

	"torrentia/signaling/internal/seeder"
)

func shutdownWithCode(code int) {
	os.Exit (code)
}

func getDefaultConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return "./config.json"
	}
	return filepath.Join(home, ".torrentia-seeder", "config.json")
}

func printUsage() {
	fmt.Println(`Torrentia Persistent CLI Seeder (torrentia-seeder)
Turns any laptop, desktop, or server into a persistent edge storage and bandwidth node on Monad.

USAGE:
  torrentia-seeder [command] [flags]

COMMANDS:
  init       Initialize configuration file and data directory
  config     Display active node configuration
  add        Add a model to the seeding catalog using its IPFS manifest
  list       List all models and verified chunks currently seeded
  remove     Remove a model from the seeding catalog
  run        Launch the persistent seeder daemon (HTTP + WebRTC signaling)
  status     Display local node health, storage usage, and metrics
  doctor     Run health checks on RPC, signaling server, and local storage
  verify     Re-verify SHA-256 hashes of stored chunks against IPFS manifest

Run 'torrentia-seeder [command] -h' for more details on any command.`)
}

func main() {
	if len(os.Args) < 2 {
		printUsage()
		shutdownWithCode(0)
	}

	cmd := os.Args[1]
	cfgPath := getDefaultConfigPath()

	switch cmd {
	case "init":
		runInit(os.Args[2:], cfgPath)
	case "config":
		runConfig(os.Args[2:], cfgPath)
	case "add":
		runAdd(os.Args[2:], cfgPath)
	case "list":
		runList(os.Args[2:], cfgPath)
	case "remove":
		runRemove(os.Args[2:], cfgPath)
	case "run":
		runDaemon(os.Args[2:], cfgPath)
	case "status":
		runStatus(os.Args[2:], cfgPath)
	case "doctor":
		runDoctor(os.Args[2:], cfgPath)
	case "help", "-h", "--help":
		printUsage()
	default:
		fmt.Printf("Unknown command: %s\n\n", cmd)
		printUsage()
		shutdownWithCode(1)
	}
}

func runInit(args []string, defaultCfgPath string) {
	fs := flag.NewFlagSet("init", flag.ExitOnError)
	configPath := fs.String("config", defaultCfgPath, "Path to write config file")
	address := fs.String("address", "", "Public Ethereum/Monad wallet address to receive seeder payments")
	dataDir := fs.String("data-dir", "", "Directory to store verified chunk files")
	signaling := fs.String("signaling", "ws://localhost:8081/ws", "WebSocket URL of Torrentia signaling server")
	rpc := fs.String("rpc", "https://testnet-rpc.monad.xyz", "Monad JSON-RPC endpoint")
	port := fs.Int("port", 9090, "HTTP chunk delivery server port")
	_ = fs.Parse(args)

	cfg := seeder.DefaultConfig()
	if *address != "" {
		cfg.SeederAddress = *address
	}
	if *dataDir != "" {
		cfg.DataDir = *dataDir
	}
	if *signaling != "" {
		cfg.SignalingURL = *signaling
	}
	if *rpc != "" {
		cfg.MonadRPCURL = *rpc
	}
	if *port > 0 {
		cfg.HTTPEndpoint.Port = *port
		cfg.HTTPEndpoint.PublicURL = fmt.Sprintf("http://127.0.0.1:%d", *port)
	}

	if cfg.SeederAddress == "" {
		fmt.Println("Notice: No wallet address specified. Run with '--address 0x...' to receive chunk payments on Monad.")
		fmt.Println("Using deployer test wallet: 0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90")
		cfg.SeederAddress = "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90"
	}

	if err := seeder.SaveConfig(*configPath, cfg); err != nil {
		fmt.Printf("Error saving config to %s: %v\n", *configPath, err)
		shutdownWithCode(1)
	}

	_ = os.MkdirAll(cfg.DataDir, 0755)
	fmt.Printf("[✓] Initialized torrentia-seeder configuration at %s\n", *configPath)
	fmt.Printf("[✓] Storage directory created at %s\n", cfg.DataDir)
	fmt.Printf("[✓] Payout address set to %s\n", cfg.SeederAddress)
}

func loadOrFatal(cfgPath string) *seeder.Config {
	cfg, err := seeder.LoadConfig(cfgPath)
	if err != nil {
		fmt.Printf("Error: could not load config from %s: %v\n", cfgPath, err)
		fmt.Println("Run 'torrentia-seeder init' first to generate your configuration.")
		shutdownWithCode(1)
	}
	return cfg
}

func runConfig(args []string, defaultCfgPath string) {
	fs := flag.NewFlagSet("config", flag.ExitOnError)
	configPath := fs.String("config", defaultCfgPath, "Path to config file")
	_ = fs.Parse(args)

	cfg := loadOrFatal(*configPath)
	data, _ := json.MarshalIndent(cfg, "", "  ")
	fmt.Println(string(data))
}

func runAdd(args []string, defaultCfgPath string) {
	fs := flag.NewFlagSet("add", flag.ExitOnError)
	configPath := fs.String("config", defaultCfgPath, "Path to config file")
	manifestCID := fs.String("manifest", "", "IPFS CID of the model's ChunkManifest")
	download := fs.Bool("download", false, "Download missing chunks from swarm")
	_ = fs.Parse(args)

	if len(fs.Args()) < 1 {
		fmt.Println("Usage: torrentia-seeder add <model-id> --manifest <cid>")
		shutdownWithCode(1)
	}
	modelID := fs.Args()[0]

	if *manifestCID == "" {
		fmt.Println("Error: --manifest <cid> is required")
		shutdownWithCode(1)
	}

	cfg := loadOrFatal(*configPath)
	engine, err := seeder.NewEngine(cfg)
	if err != nil {
		fmt.Printf("Error initializing engine: %v\n", err)
		shutdownWithCode(1)
	}

	fmt.Printf("Fetching manifest %s from IPFS gateways...\n", *manifestCID)
	manifest, err := engine.AddModel(context.Background(), modelID, *manifestCID, *download)
	if err != nil {
		fmt.Printf("Error adding model: %v\n", err)
		shutdownWithCode(1)
	}

	fmt.Printf("[✓] Model %s added to seeding catalog!\n", modelID)
	fmt.Printf("    Total Chunks: %d\n", len(manifest.Chunks))
	fmt.Printf("    Total Size:   %d bytes (%.2f MB)\n", manifest.TotalSize, float64(manifest.TotalSize)/(1024*1024))
}

func runList(args []string, defaultCfgPath string) {
	fs := flag.NewFlagSet("list", flag.ExitOnError)
	configPath := fs.String("config", defaultCfgPath, "Path to config file")
	_ = fs.Parse(args)

	cfg := loadOrFatal(*configPath)
	engine, err := seeder.NewEngine(cfg)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		shutdownWithCode(1)
	}

	models := engine.ListModels()
	if len(models) == 0 {
		fmt.Println("No models currently in seeding catalog. Use 'torrentia-seeder add <model-id> --manifest <cid>' to add one.")
		return
	}

	fmt.Printf("%-66s %-12s %-12s\n", "MODEL ID", "CHUNKS HELD", "SIZE (MB)")
	fmt.Println(strings.Repeat("-", 92))
	for _, m := range models {
		heldStr := fmt.Sprintf("%d/%d", len(m.ChunksHeld), m.TotalChunks)
		sizeMB := float64(m.TotalSize) / (1024 * 1024)
		fmt.Printf("%-66s %-12s %-12.2f\n", m.ModelID, heldStr, sizeMB)
	}
}

func runRemove(args []string, defaultCfgPath string) {
	fs := flag.NewFlagSet("remove", flag.ExitOnError)
	configPath := fs.String("config", defaultCfgPath, "Path to config file")
	purge := fs.Bool("purge", false, "Delete chunk files from disk")
	_ = fs.Parse(args)

	if len(fs.Args()) < 1 {
		fmt.Println("Usage: torrentia-seeder remove <model-id> [--purge]")
		shutdownWithCode(1)
	}
	modelID := fs.Args()[0]

	cfg := loadOrFatal(*configPath)
	engine, err := seeder.NewEngine(cfg)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		shutdownWithCode(1)
	}

	if err := engine.RemoveModel(modelID, *purge); err != nil {
		fmt.Printf("Error removing model: %v\n", err)
		shutdownWithCode(1)
	}

	fmt.Printf("[✓] Removed model %s from catalog.\n", modelID)
	if *purge {
		fmt.Println("[✓] Deleted local chunk files.")
	}
}

func runDaemon(args []string, defaultCfgPath string) {
	fs := flag.NewFlagSet("run", flag.ExitOnError)
	configPath := fs.String("config", defaultCfgPath, "Path to config file")
	port := fs.Int("port", 0, "Override HTTP chunk port")
	_ = fs.Parse(args)

	cfg := loadOrFatal(*configPath)
	if *port > 0 {
		cfg.HTTPEndpoint.Port = *port
		cfg.HTTPEndpoint.PublicURL = fmt.Sprintf("http://127.0.0.1:%d", *port)
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	fmt.Println(`
   ______                            __  _          _____               __         
  /_  __/___  _____________  ____   / /_(_)___ _   / ___/___  ___  ____/ /__  _____
   / / / __ \/ ___/ ___/ _ \/ __ \ / __/ / __ '/   \__ \/ _ \/ _ \/ __  / _ \/ ___/
  / / / /_/ / /  / /  /  __/ / / // /_/ / /_/ /   ___/ /  __/  __/ /_/ /  __/ /    
 /_/  \____/_/  /_/   \___/_/ /_/ \__/_/\__,_/   /____/\___/\___/\__,_/\___/_/     
    `)
	fmt.Printf("Torrentia Edge Seeder Daemon | Chain ID: %d | Monad Testnet\n", cfg.ChainID)
	fmt.Printf("Payout Address:  %s\n", cfg.SeederAddress)
	fmt.Printf("Signaling Hub:   %s\n", cfg.SignalingURL)
	fmt.Printf("HTTP Chunk Port: %d\n\n", cfg.HTTPEndpoint.Port)

	engine, err := seeder.NewEngine(cfg)
	if err != nil {
		slog.Error("failed to construct seeder engine", "err", err)
		shutdownWithCode(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := engine.Start(ctx); err != nil {
		slog.Error("seeder engine stopped with error", "err", err)
	}
}

func runDoctor(args []string, defaultCfgPath string) {
	fs := flag.NewFlagSet("doctor", flag.ExitOnError)
	configPath := fs.String("config", defaultCfgPath, "Path to config file")
	_ = fs.Parse(args)

	cfg := loadOrFatal(*configPath)
	fmt.Println("Running Torrentia Seeder Node Diagnostics...")
	fmt.Println(strings.Repeat("-", 60))

	results := seeder.RunDoctor(context.Background(), cfg)
	allPassed := true
	for _, res := range results {
		icon := "[✓]"
		if !res.OK {
			icon = "[✗]"
			allPassed = false
		}
		fmt.Printf("%s %-25s : %s\n", icon, res.Name, res.Message)
	}

	fmt.Println(strings.Repeat("-", 60))
	if allPassed {
		fmt.Println("All diagnostics passed! Your node is ready to seed.")
	} else {
		fmt.Println("Some checks reported warnings or errors. Check configuration.")
	}
}

func runStatus(args []string, defaultCfgPath string) {
	fs := flag.NewFlagSet("status", flag.ExitOnError)
	configPath := fs.String("config", defaultCfgPath, "Path to config file")
	_ = fs.Parse(args)

	cfg := loadOrFatal(*configPath)
	engine, err := seeder.NewEngine(cfg)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		shutdownWithCode(1)
	}

	used, _ := engine.GetStore().GetTotalUsedBytes()
	models := engine.ListModels()

	fmt.Printf("Node Payout Address: %s\n", cfg.SeederAddress)
	fmt.Printf("Active Models:       %d\n", len(models))
	fmt.Printf("Storage Used:        %.2f MB / %.2f GB\n", float64(used)/(1024*1024), float64(cfg.Limits.MaxStorageBytes)/(1024*1024*1024))
	fmt.Printf("Signaling Endpoint:  %s\n", cfg.SignalingURL)
	fmt.Printf("HTTP Chunk Server:   %s\n", cfg.HTTPEndpoint.PublicURL)
}
