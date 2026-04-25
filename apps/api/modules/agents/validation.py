import ast
import json
import os
from pathlib import Path

class AgentValidator(ast.NodeVisitor):
    def __init__(self, available_files=None):
        self.policy = self._load_policy()
        self.errors = []
        self.has_run_method = False
        self.has_agent_instance = False
        
        # Flatten allowed imports for easy checking
        self.allowed_imports = set()
        for category in self.policy.get("allowed_imports", {}).values():
            self.allowed_imports.update(category)
            
        self.forbidden_names = set(self.policy.get("forbidden_names", []))
        self.forbidden_attrs = set(self.policy.get("forbidden_attributes", []))
        
        # Track local modules
        self.local_modules = set()
        if available_files:
            for f in available_files:
                if f.endswith(".py"):
                    name = f.replace(".py", "").replace("/", ".")
                    self.local_modules.add(name)
                    self.local_modules.add(name.split('.')[0])

    def _load_policy(self):
        policy_path = Path(__file__).parent.parent.parent / "core" / "agent_policy.json"
        try:
            with open(policy_path, "r") as f:
                return json.load(f)
        except Exception:
            # Fallback to a minimal safe policy if file is missing
            return {
                "allowed_imports": {"core": ["math", "json", "time"]},
                "forbidden_names": ["eval", "exec", "open"],
                "forbidden_attributes": ["__subclasses__"]
            }

    def visit_Import(self, node):
        for alias in node.names:
            base_module = alias.name.split('.')[0]
            if base_module not in self.allowed_imports and base_module not in self.local_modules:
                self.errors.append(f"Import of '{base_module}' is not allowed.")
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.level > 0:
            return # Allow relative imports
        if node.module:
            base_module = node.module.split('.')[0]
            if base_module not in self.allowed_imports and base_module not in self.local_modules:
                self.errors.append(f"Import from '{base_module}' is not allowed.")
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id in self.forbidden_names:
                self.errors.append(f"Call to forbidden function '{node.func.id}' is not allowed.")
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr in self.forbidden_attrs:
                self.errors.append(f"Access to forbidden attribute '{node.func.attr}' is not allowed.")
        self.generic_visit(node)

    def visit_Attribute(self, node):
        if node.attr in self.forbidden_attrs:
            self.errors.append(f"Access to forbidden attribute '{node.attr}' is not allowed.")
        self.generic_visit(node)

    def visit_ClassDef(self, node):
        for item in node.body:
            if isinstance(item, ast.FunctionDef) and item.name == "run":
                args = [arg.arg for arg in item.args.args]
                if len(args) >= 2: # self + data
                    self.has_run_method = True
        self.generic_visit(node)

    def visit_Assign(self, node):
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == "agent":
                self.has_agent_instance = True
        self.generic_visit(node)

def validate_agent_code(code: str, available_files: list = None):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"Syntax error: {e}"

    validator = AgentValidator(available_files)
    validator.visit(tree)

    if validator.errors:
        return False, validator.errors[0] # Return first error for simplicity

    if not validator.has_run_method and not validator.has_agent_instance:
        return False, "Code must define a class with a 'run' method or an 'agent' instance."

    return True, "Success"
