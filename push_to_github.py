"""
Push FoodLink repository to GitHub
Usage:
    python push_to_github.py <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>
Or set GITHUB_TOKEN environment variable:
    $env:GITHUB_TOKEN="ghp_xxxx"
    python push_to_github.py
Or run interactively:
    python push_to_github.py
"""

import sys
import os
import getpass
from dulwich import porcelain
from dulwich.repo import Repo

REPO_URL = "github.com/sreemaseedupuram49-cmyk/NIAT143.git"

def main():
    token = None
    if len(sys.argv) > 1 and sys.argv[1].strip():
        token = sys.argv[1].strip()
    elif os.environ.get("GITHUB_TOKEN"):
        token = os.environ.get("GITHUB_TOKEN").strip()
    else:
        print("=" * 60)
        print("          FoodLink GitHub Push Assistant")
        print("=" * 60)
        print("Target Repository: https://github.com/sreemaseedupuram49-cmyk/NIAT143.git")
        print()
        print("GitHub requires a Personal Access Token (PAT) with 'repo' scope to push.")
        print("Generate one here: https://github.com/settings/tokens (classic token -> check 'repo')")
        print()
        try:
            token = input("Enter your GitHub Personal Access Token (PAT): ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nPush cancelled.")
            sys.exit(1)

    if not token:
        print("Error: No GitHub token provided. Cannot push without authentication.")
        sys.exit(1)

    authenticated_url = f"https://{token}@{REPO_URL}"
    
    print(f"Pushing 'main' branch to https://github.com/sreemaseedupuram49-cmyk/NIAT143.git ...")
    try:
        porcelain.push('.', authenticated_url, 'refs/heads/main')
        print()
        print("=" * 60)
        print("SUCCESS! Successfully pushed FoodLink codebase to:")
        print("https://github.com/sreemaseedupuram49-cmyk/NIAT143")
        print("=" * 60)
    except Exception as e:
        print(f"\nPush failed: {e}")
        print("Please verify that your token has 'repo' write permissions and is entered correctly.")
        sys.exit(1)

if __name__ == '__main__':
    main()
