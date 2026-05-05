from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import Agent
from backend.schemas.agent import AgentCreate
from backend.modules.protocols.squads_client import SquadsClient
import logging

logger = logging.getLogger(__name__)

squads_client = SquadsClient()


async def create_agent(db: AsyncSession, agent_data: AgentCreate, creator_wallet: str):
    # Check if agent exists
    result = await db.execute(select(Agent).where(Agent.id == agent_data.id))
    db_agent = result.scalars().first()

    new_version = {
        "version": agent_data.version,
        "files": agent_data.files,
        "requirements": agent_data.requirements,
        "entrypoint": agent_data.entrypoint,
    }

    if db_agent:
        # Update existing agent
        versions = list(db_agent.versions)
        version_exists = False
        for i, v in enumerate(versions):
            if v["version"] == agent_data.version:
                versions[i] = new_version
                version_exists = True
                break

        if not version_exists:
            versions.append(new_version)

        db_agent.versions = versions
        db_agent.current_version = agent_data.version
        db_agent.name = agent_data.name
        db_agent.description = agent_data.description
        db_agent.price = agent_data.price
    else:
        # VACN Protocol: Identity & Treasury Provisioning

        # 1. Squads V4: Deploy Sovereign Agent Treasury
        squads_pda = await squads_client.deploy_agent_treasury(
            agent_data.id, creator_wallet
        )

        # 2. Metaplex Core: Mint Agent Passport (Identity Asset)
        from solders.keypair import Keypair
        from solders.instruction import Instruction, AccountMeta
        from solders.transaction import VersionedTransaction
        from solders.message import MessageV0
        from solders.pubkey import Pubkey
        from solana.rpc.async_api import AsyncClient
        from backend.core.config import SOLANA_RPC_URL
        from backend.modules.billing.service import platform_keypair
        import struct

        # Program ID for Metaplex Core (Devnet/Mainnet)
        CORE_PROGRAM_ID = Pubkey.from_string(
            "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d"
        )

        asset_keypair = Keypair()
        mint_address = str(asset_keypair.pubkey())

        try:
            logger.info(
                f"Metaplex: Minting Agent Passport {mint_address} for {agent_data.name}"
            )

            # Construct Metaplex Core 'Create' Instruction
            name_bytes = agent_data.name.encode()
            # URI points to the VACN metadata registry
            uri = f"https://api.shoujiki.ai/agents/{agent_data.id}/metadata"
            uri_bytes = uri.encode()

            data = struct.pack("B", 0)  # Discriminator
            data += struct.pack("<I", len(name_bytes)) + name_bytes
            data += struct.pack("<I", len(uri_bytes)) + uri_bytes

            ix = Instruction(
                program_id=CORE_PROGRAM_ID,
                data=data,
                accounts=[
                    AccountMeta(
                        pubkey=asset_keypair.pubkey(), is_signer=True, is_writable=True
                    ),
                    AccountMeta(
                        pubkey=platform_keypair.pubkey(),
                        is_signer=True,
                        is_writable=True,
                    ),
                    AccountMeta(
                        pubkey=platform_keypair.pubkey(),
                        is_signer=True,
                        is_writable=False,
                    ),
                    AccountMeta(
                        pubkey=Pubkey.from_string("11111111111111111111111111111111"),
                        is_signer=False,
                        is_writable=False,
                    ),
                ],
            )

            async with AsyncClient(SOLANA_RPC_URL) as client:
                # 1. Check if platform wallet is funded (Devnet Safety)
                # We need enough for rent (~0.002) + fees. Using 0.005 SOL as safe threshold.
                bal_resp = await client.get_balance(platform_keypair.pubkey())
                if bal_resp.value < 5000000 and "devnet" in SOLANA_RPC_URL:
                    logger.warning(
                        f"SOLANA: Platform wallet {platform_keypair.pubkey()} balance ({bal_resp.value}) is too low for minting on Devnet. "
                        "Bypassing on-chain minting for development stability."
                    )
                else:
                    # Construct Metaplex Core 'Create' Instruction
                    name_bytes = agent_data.name.encode()
                    # URI points to the VACN metadata registry
                    uri = f"https://api.shoujiki.ai/agents/{agent_data.id}/metadata"
                    uri_bytes = uri.encode()

                    data = struct.pack("B", 0)  # Discriminator: Create
                    data += struct.pack("<I", len(name_bytes)) + name_bytes
                    data += struct.pack("<I", len(uri_bytes)) + uri_bytes
                    data += b"\x00"  # Update Authority: None (Option<Pubkey>)
                    data += b"\x00"  # Plugins: None (Option<Vec<Plugin>>)

                    latest_blockhash = (await client.get_latest_blockhash()).value.blockhash
                    msg = MessageV0.try_compile(
                        payer=platform_keypair.pubkey(),
                        instructions=[ix],
                        address_lookup_table_accounts=[],
                        recent_blockhash=latest_blockhash,
                    )
                    tx = VersionedTransaction(msg, [platform_keypair, asset_keypair])
                    resp = await client.send_transaction(tx)
                    logger.info(f"Metaplex: Passport mint successful: {resp.value}")

        except Exception as e:
            if any(
                phrase in str(e)
                for phrase in [
                    "AccountNotFound",
                    "debit an account",
                    "BorshIoError",
                    "InstructionError",
                    "simulation failed",
                ]
            ):
                logger.warning(
                    f"SOLANA: Protocol asset provisioning failed or bypassed: {e}. "
                    f"Proceeding with off-chain registration for agent {agent_data.name}."
                )
            else:
                logger.error(f"Metaplex: Passport minting failed: {e}")
                raise Exception(
                    f"Protocol Auth Error: Failed to mint Metaplex Passport for {agent_data.name}. {str(e)}"
                )

        db_agent = Agent(
            id=agent_data.id,
            name=agent_data.name,
            description=agent_data.description,
            versions=[new_version],
            current_version=agent_data.version,
            price=agent_data.price,
            creator_wallet=creator_wallet,
            mint_address=mint_address,
            squads_vault_pda=squads_pda,
        )
        db.add(db_agent)

    await db.commit()
    await db.refresh(db_agent)
    return db_agent


async def get_agent(db: AsyncSession, agent_id: str):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    return result.scalars().first()


async def get_all_agents(db: AsyncSession):
    result = await db.execute(select(Agent))
    return result.scalars().all()


async def get_agents_by_creator(db: AsyncSession, creator_wallet: str):
    result = await db.execute(
        select(Agent).where(Agent.creator_wallet == creator_wallet)
    )
    return result.scalars().all()


async def delete_agent(db: AsyncSession, agent_id: str):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    db_agent = result.scalars().first()
    if db_agent:
        await db.delete(db_agent)
        await db.commit()
    return db_agent
