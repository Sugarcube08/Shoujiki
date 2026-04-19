import ast

FORBIDDEN_IMPORTS = {"os", "sys", "subprocess", "socket", "requests", "httpx", "urllib", "builtins", "importlib"}

def validate_agent_code(code: str):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"Syntax error in agent code: {e}"

    has_agent_class = False
    has_run_method = False

    for node in ast.walk(tree):
        # 1. Check for forbidden imports
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split('.')[0] in FORBIDDEN_IMPORTS:
                    return False, f"Forbidden import detected: {alias.name}"
        elif isinstance(node, ast.ImportFrom):
            if node.module and node.module.split('.')[0] in FORBIDDEN_IMPORTS:
                return False, f"Forbidden import from detected: {node.module}"
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id == "__import__":
                if node.args and isinstance(node.args[0], ast.Constant) and node.args[0].value in FORBIDDEN_IMPORTS:
                    return False, f"Forbidden dynamic import detected: {node.args[0].value}"
            # Also block getattr accessing dangerous builtins if possible, but __import__ is the main one.

        # 2. Check for Agent class and run method
        if isinstance(node, ast.ClassDef) and node.name == "Agent":
            has_agent_class = True
            for item in node.body:
                if isinstance(item, ast.FunctionDef) and item.name == "run":
                    args = [arg.arg for arg in item.args.args]
                    if len(args) >= 2:
                        has_run_method = True
                    else:
                        return False, "Agent.run() method must accept (self, input_data)"

    if not has_agent_class:
        return False, "Code must define a class named 'Agent'"
    if not has_run_method:
        return False, "Class 'Agent' must define a 'run(self, input_data)' method"

    return True, "Success"
