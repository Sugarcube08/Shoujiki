from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from db.models.models import Agent
from schemas.agent import AgentCreate
import logging

logger = logging.getLogger(__name__)


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
        db_agent.price_per_million_input_tokens = agent_data.price_per_million_input_tokens
        db_agent.price_per_million_output_tokens = agent_data.price_per_million_output_tokens
        db_agent.env_vars = agent_data.env_vars
    else:
        # Practical Logic: Direct registration in the Agent Registry
        # We no longer deploy a Squads multisig or mint a Metaplex Passport by default
        # to ensure zero-latency deployment and avoid on-chain rent costs for the user.
        
        logger.info(f"REGISTRY: Registering new autonomous agent {agent_data.id} for {creator_wallet}")

        db_agent = Agent(
            id=agent_data.id,
            name=agent_data.name,
            description=agent_data.description,
            versions=[new_version],
            current_version=agent_data.version,
            price_per_million_input_tokens=agent_data.price_per_million_input_tokens,
            price_per_million_output_tokens=agent_data.price_per_million_output_tokens,
            creator_wallet=creator_wallet,
            env_vars=agent_data.env_vars,
            balance=0.0,
            total_earnings=0.0,
            total_runs=0,
            successful_runs=0
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
