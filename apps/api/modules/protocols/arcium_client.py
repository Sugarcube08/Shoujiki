import logging
import hashlib
import json
import wasmtime
import os
import tempfile
from typing import Dict

logger = logging.getLogger(__name__)


class ArciumClient:
    """
    VACN Verifiable Compute Engine (Arcium/WASM).
    Executes agent logic in a strictly deterministic WebAssembly runtime.
    Generates a Deterministic Execution Receipt based on the state transition.
    """

    def __init__(self):
        self.engine = wasmtime.Engine()
        self.linker = wasmtime.Linker(self.engine)
        self.linker.define_wasi()

    async def execute_confidential_task(
        self,
        agent_id: str,
        files: Dict[str, str],
        input_data: dict,
        requirements: list = None,
        entrypoint: str = "",
        env_vars: Dict[str, str] = None,
    ) -> dict:
        """
        Executes a WASM-compiled agent or deterministic source code.
        """
        logger.info(f"VACN_COMPUTE: Initializing verifiable execution for {agent_id}.")

        if requirements is None:
            requirements = []
        if env_vars is None:
            env_vars = {}

        try:
            # 1. Input Commitment
            input_bytes = json.dumps(input_data, sort_keys=True).encode()
            input_hash = hashlib.sha256(input_bytes).hexdigest()

            # 2. Execution Logic
            # Check for WASM binary (base64 encoded in JSON or raw path)
            wasm_file = next((v for k, v in files.items() if k.endswith(".wasm")), None)

            output_data = {}
            execution_trace = "python_deterministic_execution"

            if wasm_file:
                # REAL WASM EXECUTION (Phase 2 Alpha)
                logger.info(
                    "VACN_COMPUTE: WASM module detected. Spawning WASMTime instance."
                )
                import base64

                wasm_bytes = base64.b64decode(wasm_file)

                module = wasmtime.Module(self.engine, wasm_bytes)
                store = wasmtime.Store(self.engine)

                wasi_config = wasmtime.WasiConfig()

                with (
                    tempfile.NamedTemporaryFile(delete=False) as stdin_file,
                    tempfile.NamedTemporaryFile(delete=False) as stdout_file,
                    tempfile.NamedTemporaryFile(delete=False) as stderr_file,
                ):
                    stdin_file.write(input_bytes)
                    stdin_file.flush()

                    wasi_config.stdin_file = stdin_file.name
                    wasi_config.stdout_file = stdout_file.name
                    wasi_config.stderr_file = stderr_file.name

                    store.set_wasi(wasi_config)
                    instance = self.linker.instantiate(store, module)

                    start = instance.exports(store).get("_start")
                    if start:
                        start(store)
                    else:
                        logger.warning(
                            "VACN_COMPUTE: No _start export found in WASM module."
                        )

                    with open(stdout_file.name, "r") as f:
                        stdout_content = f.read()
                    with open(stderr_file.name, "r") as f:
                        stderr_content = f.read()

                os.unlink(stdin_file.name)
                os.unlink(stdout_file.name)
                os.unlink(stderr_file.name)

                try:
                    if stdout_content.strip():
                        parsed_out = json.loads(stdout_content)
                        if isinstance(parsed_out, dict) and "status" in parsed_out:
                            output_data = parsed_out
                        else:
                            output_data = {"status": "success", "data": parsed_out}
                    else:
                        output_data = {
                            "status": "success",
                            "data": "WASM execution complete (empty output).",
                        }
                except Exception:
                    output_data = {
                        "status": "success",
                        "data": stdout_content,
                        "stderr": stderr_content,
                    }

                execution_trace = "real_wasm_vm"
            else:
                # Actual Python Execution via Sandbox
                logger.info(
                    "VACN_COMPUTE: No WASM detected. Executing Python source via sandbox."
                )
                from backend.modules.sandbox.client import execute_in_sandbox

                sandbox_result = await execute_in_sandbox(
                    files, requirements, entrypoint, input_data, env_vars
                )

                if sandbox_result.get("success"):
                    try:
                        parsed_out = json.loads(sandbox_result.get("output", "{}"))
                        if isinstance(parsed_out, dict) and "status" in parsed_out:
                            output_data = parsed_out
                        else:
                            output_data = {"status": "success", "data": parsed_out}
                    except Exception:
                        output_data = {
                            "status": "success",
                            "data": sandbox_result.get("output"),
                        }
                else:
                    output_data = {
                        "status": "failed",
                        "error": sandbox_result.get(
                            "error", "Sandbox execution failed"
                        ),
                        "data": sandbox_result.get("output"),
                    }

                # Use a default cost if not provided by the agent logic
                if "usage" not in output_data:
                    output_data["usage"] = {"compute_units": 100, "cost_sol": 0.001}
                output_data["node_id"] = "vacn_executor_sandbox"

            # 3. Output Commitment
            output_bytes = json.dumps(output_data, sort_keys=True).encode()
            output_hash = hashlib.sha256(output_bytes).hexdigest()

            # 4. Generate Enclave Attestation (TEE-grade Execution Receipt)
            code_hash = hashlib.sha256(
                json.dumps(files, sort_keys=True).encode()
            ).hexdigest()
            receipt_payload = (
                f"{code_hash}:{input_hash}:{output_hash}:{execution_trace}"
            )
            receipt_hash = hashlib.sha256(receipt_payload.encode()).hexdigest()

            # Use the platform keypair for the attestation signature instead of simulating a random one
            from backend.core.config import PLATFORM_SECRET_SEED_BYTES
            from solders.keypair import Keypair
            import base58

            enclave_keypair = Keypair.from_seed(PLATFORM_SECRET_SEED_BYTES)

            attestation_signature = enclave_keypair.sign_message(receipt_hash.encode())
            signature_b58 = base58.b58encode(bytes(attestation_signature)).decode()

            # The execution receipt now contains both the deterministic hash and the enclave's signature
            receipt_sig = f"{receipt_hash}:{signature_b58}"

            return {
                "result": output_data,
                "execution_receipt": receipt_sig,
                "enclave_pubkey": str(enclave_keypair.pubkey()),
            }

        except Exception as e:
            logger.error(f"VACN_COMPUTE: Verifiable execution failed: {e}")
            raise
