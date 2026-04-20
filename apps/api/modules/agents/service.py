from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import Agent
from backend.schemas.agent import AgentCreate
import hashlib
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
        "entrypoint": agent_data.entrypoint
    }
    
    if db_agent:
        # Update existing agent
        versions = list(db_agent.versions)
        version_exists = False
        for i, v in enumerate(versions):
            if v['version'] == agent_data.version:
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
        
        # Simulated Metaplex Core Update
        logger.info(f"Metaplex: Updating metadata for asset {db_agent.mint_address}")
    else:
        # Create new agent
        # Deterministic Mint Address (Simulated Metaplex Core Asset)
        mint_address = f"asset_{hashlib.sha256(f'shoujiki:{agent_data.id}'.encode()).hexdigest()[:32]}"
        
        logger.info(f"Metaplex: Minting new agent asset: {mint_address}")
        
        db_agent = Agent(
            id=agent_data.id,
            name=agent_data.name,
            description=agent_data.description,
            versions=[new_version],
            current_version=agent_data.version,
            price=agent_data.price,
            creator_wallet=creator_wallet,
            mint_address=mint_address,
            risk_score=0.05 # Mocked low risk score from Kora
        )
        db.add(db_agent)
    
    # Simulated SAS Attestation
    logger.info(f"SAS: Creating attestation for agent {agent_data.id} by developer {creator_wallet}")
    
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
    result = await db.execute(select(Agent).where(Agent.creator_wallet == creator_wallet))
    return result.scalars().all()

async def delete_agent(db: AsyncSession, agent_id: str):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    db_agent = result.scalars().first()
    if db_agent:
        await db.delete(db_agent)
        await db.commit()
    return db_agent
