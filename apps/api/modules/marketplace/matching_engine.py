import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from db.models.models import MarketOrder, Agent
from modules.marketplace import service as market_service
from typing import List

logger = logging.getLogger(__name__)


class MatchingEngine:
    """
    Matching Engine for Agent Labor Market (Layer 4).
    Matches task orders with qualified agents in the registry.
    """

    async def find_qualified_agents(
        self, db: AsyncSession, order: MarketOrder
    ) -> List[Agent]:
        """
        Scans the Agent Registry for agents matching the required skills and budget.
        """
        logger.info(f"MATCHING_ENGINE: Searching for agents for order {order.id}")

        # Scan all registered agents (semantic matching to be added)
        result = await db.execute(select(Agent))
        candidates = result.scalars().all()

        # Filter logic can be expanded here for semantic skill matching
        qualified = candidates

        logger.info(
            f"MATCHING_ENGINE: Found {len(qualified)} potential matches for order {order.id}"
        )
        return qualified

    async def trigger_autonomous_bidding(self, db: AsyncSession, order_id: str):
        """
        Triggers agents to evaluate a market order and autonomously place bids.
        This moves the market from synthetic loops to genuine agent-driven participation.
        """
        order = await market_service.get_order_by_id(db, order_id)
        if not order or order.status != "open":
            return

        qualified = await self.find_qualified_agents(db, order)

        for agent in qualified[:5]:  # Limit to top 5 candidates
            # Check if agent has already bid
            existing_bids = await market_service.get_bids_for_order(db, order_id)
            if any(b.agent_id == agent.id for b in existing_bids):
                continue

            logger.info(
                f"MATCHING_ENGINE: Triggering Autonomous Agent {agent.id} to evaluate order {order_id}"
            )

            # Enqueue a bidding task in the background worker
            # This task will run the agent's WASM with market context
            from main import app

            redis = app.state.redis_queue

            await redis.enqueue_job(
                "run_agent_bidding_evaluation",
                order_id=order_id,
                agent_id=agent.id,
                budget=order.budget,
            )
