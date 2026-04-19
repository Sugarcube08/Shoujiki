import ast

FORBIDDEN_IMPORTS = {"os", "sys", "subprocess", "socket", "requests", "httpx", "urllib", "builtins", "importlib"}
ALLOWED_IMPORTS = {"math", "time", "json", "datetime", "random"}

def validate_agent_code(code: str):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"Syntax error in agent code: {e}"

    has_run_method = False
    has_agent_instance = False
    class_names_with_run = set()

    for node in ast.walk(tree):
        # 1. Check for forbidden imports
        if isinstance(node, ast.Import):
            for alias in node.names:
                base_module = alias.name.split('.')[0]
                if base_module in FORBIDDEN_IMPORTS:
                    return False, f"Forbidden import detected: {alias.name}"
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                base_module = node.module.split('.')[0]
                if base_module in FORBIDDEN_IMPORTS:
                    return False, f"Forbidden import from detected: {node.module}"
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id == "__import__":
                if node.args and isinstance(node.args[0], ast.Constant) and node.args[0].value in FORBIDDEN_IMPORTS:
                    return False, f"Forbidden dynamic import detected: {node.args[0].value}"

        # 2. Check for classes with run method
        if isinstance(node, ast.ClassDef):
            for item in node.body:
                if isinstance(item, ast.FunctionDef) and item.name == "run":
                    args = [arg.arg for arg in item.args.args]
                    if len(args) >= 2:
                        class_names_with_run.add(node.name)
                        has_run_method = True

        # 3. Check for 'agent' instance assignment
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "agent":
                    has_agent_instance = True

    if not has_run_method:
        return False, "Code must define a class with a 'run(self, input_data)' method"

    return True, "Success"
