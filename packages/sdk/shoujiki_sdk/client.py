import requests
import os
import json

class ShoujikiClient:
    def __init__(self, base_url="http://localhost:8000", token=None):
        self.base_url = base_url
        self.token = token

    def deploy_agent(self, agent_id, name, description, price, code):
        # ... (keep existing for backward compatibility)
        pass

    def deploy_codebase(self, agent_id, name, description, price, zip_bytes, entrypoint="main.py"):
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        files = {
            'file': ('codebase.zip', zip_bytes, 'application/zip')
        }
        data = {
            'id': agent_id,
            'name': name,
            'description': description,
            'price': str(price),
            'entrypoint': entrypoint
        }
        
        response = requests.post(f"{self.base_url}/agents/deploy/zip", files=files, data=data, headers=headers)
        response.raise_for_status()
        return response.json()
