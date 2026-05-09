import logging
import hashlib
import json
import wasmtime
import os
import tempfile
import base58
from typing import Dict
from core.config import PLATFORM_SECRET_SEED_BYTES
from solders.keypair import Keypair

logger = logging.getLogger(__name__)


class ArciumClient:
    """
    VACN Verifiable Compute Engine.
    Executes agent logic in a strictly deterministic runtime (WASM or Sandbox).
    Generates a Verifiable Execution Receipt.
    """

    def __init__(self):
        self.engine = wasmtime.Engine()
        self.linker = wasmtime.Linker(self.engine)
        self.linker.define_wasi()
        self.enclave_keypair = Keypair.from_seed(PLATFORM_SECRET_SEED_BYTES)

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
            wasm_file = next((v for k, v in files.items() if k.endswith(".wasm")), None)

            output_data = {}
            execution_trace = "python_deterministic_execution"

            if wasm_file:
                logger.info("VACN_COMPUTE: WASM module detected. Spawning WASMTime instance.")
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
                        output_data = parsed_out if isinstance(parsed_out, dict) else {"status": "success", "data": parsed_out}
                    else:
                        output_data = {"status": "success", "data": "WASM complete"}
                except Exception:
                    output_data = {"status": "success", "data": stdout_content, "stderr": stderr_content}

                execution_trace = "real_wasm_vm"
            else:
                logger.info("VACN_COMPUTE: Executing Python source via sandbox.")
                from modules.sandbox.client import execute_in_sandbox
                sandbox_result = await execute_in_sandbox(agent_id, files, requirements, entrypoint, input_data, env_vars)

                if sandbox_result.get("success"):
                    try:
                        parsed_out = json.loads(sandbox_result.get("output", "{}"))
                        output_data = parsed_out if isinstance(parsed_out, dict) else {"status": "success", "data": parsed_out}
                    except Exception:
                        output_data = {"status": "success", "data": sandbox_result.get("output")}
                else:
                    output_data = {"status": "failed", "error": sandbox_result.get("error")}

            # 3. Verifiable Receipt Generation (Practical logic)
            output_bytes = json.dumps(output_data, sort_keys=True).encode()
            output_hash = hashlib.sha256(output_bytes).hexdigest()
            code_hash = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()

            # The receipt is a manifest of the execution context
            receipt_manifest = {
                "code_hash": code_hash,
                "input_hash": input_hash,
                "output_hash": output_hash,
                "execution_trace": execution_trace,
                "agent_id": agent_id
            }
            manifest_json = json.dumps(receipt_manifest, sort_keys=True)
            
            # Sign the manifest hash with the platform keypair (acting as the verifier/executor)
            # The frontend verifies against the hash, so we sign the hash hex string bytes.
            manifest_hash = hashlib.sha256(manifest_json.encode()).hexdigest()
            signature = self.enclave_keypair.sign_message(manifest_hash.encode())
            receipt_sig = f"{manifest_hash}:{base58.b58encode(bytes(signature)).decode()}"

            return {
                "result": output_data,
                "execution_receipt": receipt_sig,
                "manifest": receipt_manifest,
                "enclave_pubkey": str(self.enclave_keypair.pubkey())
            }

        except Exception as e:
            logger.error(f"VACN_COMPUTE: Execution failed: {e}")
            raise
