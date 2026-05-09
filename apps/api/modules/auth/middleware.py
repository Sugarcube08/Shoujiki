import base64
import base58
import logging
import json

import nacl.exceptions
import nacl.signing
from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class X402PaymentMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only enforce on /agents/run
        if request.url.path == "/agents/run" and request.method == "POST":
            # For aggregated sessions, we skip the per-task SVM signature
            # We peek at the body to see if session_id is present
            body = await request.body()

            # Reset request body for downstream handlers
            async def receive():
                return {"type": "http.request", "body": body}

            request._receive = receive

            try:
                data = json.loads(body)
                if data.get("session_id"):
                    # Session active, skip per-task signature
                    return await call_next(request)
            except Exception:
                pass

            # Real x402 SVM Signature Verification
            payment_sig = request.headers.get("X-Payment-Signature")
            pubkey_b58 = request.headers.get("X-Payment-Pubkey")

            if not payment_sig or not pubkey_b58:
                raise HTTPException(
                    status_code=402,
                    detail="Payment Required: x402 SVM Signature/Pubkey missing",
                )

            try:
                # In a real x402 flow, the signature is over the payment payload or a challenge
                # For this MVP, we verify the signature against the raw request body to ensure integrity
                verify_key = nacl.signing.VerifyKey(base58.b58decode(pubkey_b58))
                verify_key.verify(body, base64.b64decode(payment_sig))
                logger.info(f"x402: Signature verified for pubkey {pubkey_b58}")
            except (nacl.exceptions.BadSignatureError, Exception) as e:
                logger.error(f"x402: Verification failed: {e}")
                raise HTTPException(
                    status_code=402, detail="Invalid SVM Payment Signature"
                )

        response = await call_next(request)
        return response
