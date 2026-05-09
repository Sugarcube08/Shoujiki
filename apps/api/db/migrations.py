import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine
from db.session import Base

# Import models to ensure they are registered with Base.metadata

logger = logging.getLogger(__name__)

async def run_consolidated_migrations(engine: AsyncEngine):
    """
    Consolidated migration utility. 
    1. Ensures all tables exist via SQLAlchemy Base.
    2. Safely adds any missing columns (Exhaustive sync).
    """
    async with engine.begin() as conn:
        # 1. Create tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)
        
        # 2. Exhaustive Schema Sync (Safety for existing/legacy columns)
        # Since the DB was dropped, this acts as a verification step.
        migrations = [
            # User Wallets
            ("user_wallets", "balance", "FLOAT DEFAULT 0.0"),
            ("user_wallets", "allowances", "JSON DEFAULT '{}'"),
            
            # Agents
            ("agents", "name", "VARCHAR"),
            ("agents", "description", "TEXT"),
            ("agents", "versions", "JSON DEFAULT '[]'"),
            ("agents", "current_version", "VARCHAR DEFAULT 'v1'"),
            ("agents", "price_per_million_input_tokens", "FLOAT DEFAULT 0.01"),
            ("agents", "price_per_million_output_tokens", "FLOAT DEFAULT 0.05"),
            ("agents", "creator_wallet", "VARCHAR"),
            ("agents", "env_vars", "JSON DEFAULT '{}'"),
            ("agents", "total_runs", "FLOAT DEFAULT 0.0"),
            ("agents", "successful_runs", "FLOAT DEFAULT 0.0"),
            ("agents", "balance", "FLOAT DEFAULT 0.0"),
            ("agents", "total_earnings", "FLOAT DEFAULT 0.0"),
            ("agents", "lineage_parent_id", "VARCHAR"),
            
            # Tasks
            ("tasks", "agent_id", "VARCHAR"),
            ("tasks", "user_wallet", "VARCHAR"),
            ("tasks", "input_data", "TEXT"),
            ("tasks", "result", "TEXT"),
            ("tasks", "status", "VARCHAR DEFAULT 'queued'"),
            ("tasks", "depth", "FLOAT DEFAULT 0.0"),
            ("tasks", "input_tokens", "FLOAT DEFAULT 0.0"),
            ("tasks", "output_tokens", "FLOAT DEFAULT 0.0"),
            ("tasks", "poae_hash", "VARCHAR"),
            
            # Workflows
            ("workflows", "name", "VARCHAR"),
            ("workflows", "creator_wallet", "VARCHAR"),
            ("workflows", "nodes", "JSON DEFAULT '[]'"),
            ("workflows", "edges", "JSON DEFAULT '[]'"),
            
            # Workflow Runs
            ("workflow_runs", "workflow_id", "VARCHAR"),
            ("workflow_runs", "user_wallet", "VARCHAR"),
            ("workflow_runs", "status", "VARCHAR DEFAULT 'queued'"),
            ("workflow_runs", "max_budget", "FLOAT DEFAULT 0.0"),
            ("workflow_runs", "total_spend", "FLOAT DEFAULT 0.0"),
            ("workflow_runs", "active_nodes", "JSON DEFAULT '[]'"),
            ("workflow_runs", "completed_steps", "JSON DEFAULT '{}'"),
            ("workflow_runs", "results", "JSON"),
        ]
        
        for table, column, col_type in migrations:
            try:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type}"))
            except Exception:
                # We expect some failures if tables are brand new or columns already exist
                pass

    logger.info("Database migration and consolidation complete.")
