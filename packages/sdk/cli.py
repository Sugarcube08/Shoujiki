import argparse
import os
import sys
from shoujiki_sdk.client import ShoujikiClient

def main():
    parser = argparse.ArgumentParser(description="Shoujiki CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Deploy command (individual file)
    deploy_parser = subparsers.add_parser("deploy", help="Deploy an agent from a single file")
    deploy_parser.add_argument("file", help="Path to the agent Python file")
    deploy_parser.add_argument("--id", required=True, help="Unique agent ID")
    deploy_parser.add_argument("--name", required=True, help="Agent name")
    deploy_parser.add_argument("--description", help="Agent description")
    deploy_parser.add_argument("--price", required=True, type=float, help="Price in SOL")
    deploy_parser.add_argument("--url", default="http://localhost:8000", help="API base URL")

    # Push command (directory/codebase)
    push_parser = subparsers.add_parser("push", help="Deploy a full codebase from a directory")
    push_parser.add_argument("path", help="Path to the agent directory")
    push_parser.add_argument("--id", required=True, help="Unique ID for the agent")
    push_parser.add_argument("--name", required=True, help="Display name for the agent")
    push_parser.add_argument("--price", required=True, type=float, help="Price in SOL per run")
    push_parser.add_argument("--entry", default="main.py", help="Entrypoint file (default: main.py)")
    push_parser.add_argument("--url", default="http://localhost:8000", help="API base URL")

    args = parser.parse_args()
    token = os.getenv("SHOUJIKI_TOKEN")

    if args.command == "deploy":
        if not token:
            print("Error: SHOUJIKI_TOKEN environment variable not set")
            sys.exit(1)

        if not os.path.exists(args.file):
            print(f"Error: File {args.file} not found")
            sys.exit(1)

        with open(args.file, "r") as f:
            code = f.read()

        client = ShoujikiClient(base_url=args.url, token=token)
        try:
            result = client.deploy_agent(
                agent_id=args.id,
                name=args.name,
                description=args.description,
                price=args.price,
                code=code
            )
            print(f"🚀 Successfully deployed agent: {result['name']} (ID: {result['id']})")
        except Exception as e:
            print(f"❌ Deployment failed: {e}")
            sys.exit(1)

    elif args.command == "push":
        if not token:
            print("Error: SHOUJIKI_TOKEN environment variable not set")
            sys.exit(1)

        client = ShoujikiClient(base_url=args.url, token=token)
        import zipfile
        import io
        
        if not os.path.isdir(args.path):
            print(f"Error: Path {args.path} is not a directory")
            sys.exit(1)

        print(f"📦 Packaging codebase from {args.path}...")
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(args.path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, args.path)
                    zip_file.write(file_path, arcname)
        
        try:
            result = client.deploy_codebase(
                agent_id=args.id,
                name=args.name,
                description="", 
                price=args.price,
                zip_bytes=zip_buffer.getvalue(),
                entrypoint=args.entry
            )
            print(f"🚀 Successfully pushed codebase! Agent: {result['name']} (ID: {result['id']})")
        except Exception as e:
            print(f"❌ Deployment failed: {e}")
            sys.exit(1)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
