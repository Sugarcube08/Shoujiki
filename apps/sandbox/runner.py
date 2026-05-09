import subprocess
import tempfile
import os
import json
import resource
import logging
import shutil
import venv
import base64

logger = logging.getLogger(__name__)

SANDBOX_BASE_DIR = os.path.abspath(os.getenv("SANDBOX_STORAGE_PATH", "./agent_data"))
os.makedirs(SANDBOX_BASE_DIR, exist_ok=True)

def set_limits():
    # Limit memory to 512MB
    mem_limit = 512 * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (mem_limit, mem_limit))
    # Limit CPU time to 60 seconds
    resource.setrlimit(resource.RLIMIT_CPU, (60, 60))
    # Limit file size to 5MB
    resource.setrlimit(resource.RLIMIT_FSIZE, (5 * 1024 * 1024, 5 * 1024 * 1024))
    # Limit number of processes to 1024
    resource.setrlimit(resource.RLIMIT_NPROC, (1024, 1024))


def run_agent_code(
    agent_id: str,
    files: dict,
    requirements: list,
    entrypoint: str,
    input_data: str,
    env_vars: dict = None,
):
    """
    Executes agent code in a persistent, dedicated sandbox environment.
    Uses Virtual Environments (venv) per agent to cache installed requirements.
    """
    # Prepare agent workspace
    agent_dir = os.path.join(SANDBOX_BASE_DIR, agent_id)
    os.makedirs(agent_dir, exist_ok=True)
    
    app_dir = os.path.join(agent_dir, "app")
    os.makedirs(app_dir, exist_ok=True)
    
    venv_dir = os.path.join(agent_dir, "venv")
    
    # 1. Ensure Virtual Environment exists
    if not os.path.exists(os.path.join(venv_dir, "bin", "python")):
        logger.info(f"Sandbox: Creating new dedicated box for agent {agent_id}")
        venv.create(venv_dir, with_pip=True)

    # 2. Sync Agent Files
    for f in os.listdir(app_dir):
        f_path = os.path.join(app_dir, f)
        try:
            if os.path.isfile(f_path): os.unlink(f_path)
            elif os.path.isdir(f_path): shutil.rmtree(f_path)
        except Exception: pass

    for filename, content in files.items():
        if ".." in filename or filename.startswith("/"):
            return False, "", f"Invalid filename: {filename}", []
        file_path = os.path.join(app_dir, filename)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w") as f:
            f.write(content)

    # 3. Create input file
    in_path = os.path.join(app_dir, "input.json")
    with open(in_path, "w") as f:
        f.write(input_data)

    # 4. Handle Requirements (Cached)
    req_file = os.path.join(agent_dir, "requirements.txt")
    current_reqs = "\n".join(sorted(requirements))
    
    needs_install = False
    if not os.path.exists(req_file):
        needs_install = True
    else:
        with open(req_file, "r") as f:
            if f.read().strip() != current_reqs.strip():
                needs_install = True

    if needs_install and requirements:
        logger.info(f"Sandbox: Syncing requirements for {agent_id}: {requirements}")
        pip_path = os.path.join(venv_dir, "bin", "pip")
        with open(req_file, "w") as f:
            f.write(current_reqs)
        
        # Install with timeout
        subprocess.run(
            [pip_path, "install", "--no-cache-dir"] + requirements,
            capture_output=True,
            timeout=120
        )

    # 5. Inject internal shoujiki module
    env_json = json.dumps(env_vars or {})
    env_b64 = base64.b64encode(env_json.encode()).decode()
    
    shoujiki_module = f"""
import json
import os
import base64

class Shoujiki:
    def __init__(self):
        try:
            env_json = base64.b64decode('{env_b64}').decode()
            self.env = json.loads(env_json)
        except Exception:
            self.env = {{}}

    def get_env(self, key, default=None):
        return self.env.get(key, default)

    def hire_agent(self, agent_id, input_data):
        request = {{
            "type": "hire",
            "agent_id": agent_id,
            "input_data": input_data
        }}
        with open('hire_request.json', 'w') as f:
            f.write(json.dumps(request))
        return {{"status": "requested", "note": "Machine-to-machine loop initiated"}}

shoujiki = Shoujiki()
"""
    with open(os.path.join(app_dir, "shoujiki.py"), "w") as f:
        f.write(shoujiki_module)

    module_name = entrypoint.replace(".py", "").replace("/", ".")
    wrapper_code = f"""
import json
import sys
import os
import importlib

# --- SHOUJIKI SECURE AUDIT SANDBOX ---
def audit_hook(event, args):
    if event in ('socket.bind', 'socket.listen'):
        raise PermissionError(f"Shoujiki Sandbox: Server-side networking is forbidden ({{event}})")
    
    if event in ('os.system', 'os.spawn', 'subprocess.Popen', 'os.execve', 'os.posix_spawn'):
        raise PermissionError(f"Shoujiki Sandbox: Subprocess execution is forbidden ({{event}})")

    if event == 'open':
        path = args[0]
        if isinstance(path, (str, bytes)):
            path_str = path if isinstance(path, str) else path.decode(errors='ignore')
            # Allow venv but block system escape
            if any(p in path_str for p in ['/etc/', '/root/', '/home/', '~', '../']) and '{agent_id}' not in path_str:
                raise PermissionError(f"Shoujiki Sandbox: Filesystem escape detected ({{path_str}})")

sys.addaudithook(audit_hook)
# --------------------------------------

sys.path.insert(0, os.path.abspath("."))

try:
    with open('input.json', 'r') as f:
        input_data = json.load(f)

    module = importlib.import_module('{module_name}')
    agent = getattr(module, 'agent', None)
    
    if not agent:
        for name in dir(module):
            obj = getattr(module, name)
            if isinstance(obj, type) and hasattr(obj, 'run'):
                agent = obj()
                break
                
    if agent and hasattr(agent, 'run'):
        result = agent.run(input_data)
        print("---RESULT_START---")
        print(json.dumps(result))
        print("---RESULT_END---")
    else:
        print("Error: No agent with 'run(self, data)' method found in {entrypoint}", file=sys.stderr)
        sys.exit(1)
except Exception as e:
    import traceback
    print(f"Agent execution error: {{e}}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
"""
    wrapper_path = os.path.join(app_dir, "wrapper.py")
    with open(wrapper_path, "w") as f:
        f.write(wrapper_code)

    # 6. Execution with isolation
    python_bin = os.path.join(venv_dir, "bin", "python3")
    env = os.environ.copy()
    if env_vars:
        env.update(env_vars)

    bwrap_command = [
        "bwrap",
        "--ro-bind", "/usr", "/usr",
        "--symlink", "usr/bin", "/bin",
        "--symlink", "usr/lib", "/lib",
        "--symlink", "usr/lib64", "/lib64",
        "--symlink", "usr/sbin", "/sbin",
        "--dir", "/tmp",
        "--proc", "/proc",
        "--dev", "/dev",
        "--unshare-all",
        "--hostname", f"agent-{agent_id[:8]}",
        "--bind", app_dir, "/app",
        "--bind", venv_dir, "/venv",
        "--chdir", "/app",
        "/venv/bin/python3", "wrapper.py",
    ]

    unshare_command = [
        "unshare", "--map-root-user", "--net", "--pid", "--fork",
        python_bin, "wrapper.py"
    ]

    # Tier 1: Bubblewrap (bwrap) - Kernel Level Isolation
    process = None
    try:
        process = subprocess.run(bwrap_command, capture_output=True, text=True, timeout=30, preexec_fn=set_limits, env=env)
        if process.returncode != 0:
            logger.warning(f"Sandbox: Bubblewrap failed (code {process.returncode}). Stderr: {process.stderr}")
            process = None # Force fallback
    except Exception as e:
        logger.warning(f"Sandbox: Bubblewrap execution error: {e}")
        process = None

    # Tier 2: Unshare (Namespace isolation)
    if process is None:
        try:
            process = subprocess.run(unshare_command, cwd=app_dir, capture_output=True, text=True, timeout=30, preexec_fn=set_limits, env=env)
            if process.returncode != 0:
                logger.warning(f"Sandbox: Unshare failed (code {process.returncode}). Stderr: {process.stderr}")
                process = None # Force fallback
        except Exception as e:
            logger.warning(f"Sandbox: Unshare execution error: {e}")
            process = None

    # Tier 3: Hardened Runtime Fallback (Python Audit Hooks)
    if process is None:
        logger.warning(f"Sandbox: Kernel isolation failed. Falling back to Tier 3: Hardened Runtime (Audit Hooks).")
        try:
            process = subprocess.run(
                [python_bin, "wrapper.py"],
                cwd=app_dir,
                capture_output=True,
                text=True,
                timeout=30,
                preexec_fn=set_limits,
                env=env,
            )
        except Exception as final_e:
            return (False, "", f"Fail-Closed: All execution methods (including Hardened Runtime) failed. Error: {str(final_e)}", [])

    # 7. Result Processing
    MAX_OUTPUT_SIZE = 100000
    stdout = process.stdout[:MAX_OUTPUT_SIZE]
    stderr = process.stderr[:MAX_OUTPUT_SIZE]

    result = ""
    if "---RESULT_START---" in stdout:
        parts = stdout.split("---RESULT_START---")
        if len(parts) > 1 and "---RESULT_END---" in parts[1]:
            result = parts[1].split("---RESULT_END---")[0].strip()

    hire_requests = []
    hire_req_path = os.path.join(app_dir, "hire_request.json")
    if os.path.exists(hire_req_path):
        try:
            with open(hire_req_path, "r") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    hire_requests.append(data)
        except Exception: pass

    return process.returncode == 0, result, stderr, hire_requests
