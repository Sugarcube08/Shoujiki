import subprocess
import tempfile
import os
import json
import resource

def set_limits():
    # Limit memory to 128MB
    mem_limit = 128 * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (mem_limit, mem_limit))
    # Limit CPU time to 5 seconds
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))

def run_agent_code(code: str, input_data: str):
    # We need a way to pass the input_data to the script and get the result back.
    # We'll use a temporary file for the input data to avoid any code injection risks.
    
    with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f_in:
        f_in.write(input_data)
        in_path = f_in.name

    full_code = f"""
import json
import sys
import os

try:
    with open('{in_path}', 'r') as __f:
        __input_data = json.load(__f)

    # Define isolated globals for the agent
    __agent_globals = {{"__builtins__": __import__("builtins").__dict__.copy()}}
    
    # Execute the agent code
    exec({repr(code)}, __agent_globals)

    if 'agent' in __agent_globals:
        __result = __agent_globals['agent'].run(__input_data)
        print("---RESULT_START---")
        print(json.dumps(__result))
        print("---RESULT_END---")
    else:
        print("Error: No 'agent' instance found in script", file=sys.stderr)
except Exception as e:
    print(f"Agent execution error: {{e}}", file=sys.stderr)
    sys.exit(1)
finally:
    # Cleanup the input file safely
    if os.path.exists('{in_path}'):
        try:
            os.remove('{in_path}')
        except:
            pass
"""

    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(full_code)
        temp_path = f.name

    try:
        process = subprocess.run(
            ["python3", temp_path],
            capture_output=True,
            text=True,
            timeout=10, # Wall clock timeout
            preexec_fn=set_limits
        )
        
        # Limit output size to prevent memory abuse via stdout spam
        MAX_OUTPUT_SIZE = 10000
        stdout = process.stdout[:MAX_OUTPUT_SIZE]
        stderr = process.stderr[:MAX_OUTPUT_SIZE]
        
        # Extract result from stdout
        result = ""
        if "---RESULT_START---" in stdout:
            parts = stdout.split("---RESULT_START---")
            if len(parts) > 1 and "---RESULT_END---" in parts[1]:
                result_part = parts[1].split("---RESULT_END---")[0].strip()
                result = result_part
        
        return process.returncode == 0, result, stderr
    except subprocess.TimeoutExpired:
        return False, "", "Execution timed out"
    except Exception as e:
        return False, "", str(e)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
