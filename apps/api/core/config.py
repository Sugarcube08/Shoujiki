import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file relative to this file's directory (works in Docker and local)
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Ensure the seed is exactly 32 bytes for Solana keypair generation
_raw_seed = os.getenv("PLATFORM_SECRET_SEED", "shoujiki_platform_secret_32_char")
if len(_raw_seed) != 32:
    # Use SHA256 to consistently get a 32-byte seed regardless of input length
    import hashlib

    PLATFORM_SECRET_SEED = hashlib.sha256(_raw_seed.encode()).hexdigest()[:32]
else:
    PLATFORM_SECRET_SEED = _raw_seed

PLATFORM_WALLET = os.getenv("PLATFORM_WALLET", "")  # Will be derived from seed if empty
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
SANDBOX_URL = os.getenv("SANDBOX_URL", "http://localhost:8001")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://shoujiki:shoujiki_v3_secure_db_2026@db:5432/shoujiki",
)

# Redis Configuration (Split Queue and PubSub for performance and isolation)
REDIS_QUEUE_HOST = os.getenv("REDIS_QUEUE_HOST", "127.0.0.1")
REDIS_QUEUE_PORT = int(os.getenv("REDIS_QUEUE_PORT", 6379))
REDIS_PUBSUB_HOST = os.getenv("REDIS_PUBSUB_HOST", "127.0.0.1")
REDIS_PUBSUB_PORT = int(os.getenv("REDIS_PUBSUB_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "shoujiki_v3_secure_redis_2026")

SQUADS_PROGRAM_ID = os.getenv(
    "SQUADS_PROGRAM_ID", "SQDS4Byj9s7BfR7atvH9iSnduXW1U9CAdX9rW5L2S8X"
)
SQUADS_MULTISIG_PDA = os.getenv(
    "SQUADS_MULTISIG_PDA", "SQDS_PLATFORM_MULTISIG_ADDRESS_CHANGE_ME"
)
# Squads Multisig Program ID: SQDS4Byj9s7BfR7atvH9iSnduXW1U9CAdX9rW5L2S8X (devnet/Devnet standard)
