#!/bin/bash
# Full release workflow for Cinny-Min
# Usage: ./release.sh [patch|minor|major|X.Y.Z] "Release notes"

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

cd "$(dirname "$0")"

VERSION_BUMP="${1:-patch}"
NOTES="${2:-}"

echo -e "${CYAN}=== Cinny-Min Release Workflow ===${NC}\n"

# Step 1: Bump version
echo -e "${GREEN}[1/5] Bumping version...${NC}"
./bump-version.sh "$VERSION_BUMP"

# Get the new version
VERSION=$(grep -o '"version": "[^"]*"' src-tauri/tauri.conf.json | head -1 | cut -d'"' -f4)

# Step 2: Commit and push
echo -e "\n${GREEN}[2/5] Committing and pushing...${NC}"
if [ -n "$NOTES" ]; then
    COMMIT_MSG="$NOTES"
else
    COMMIT_MSG="release: v${VERSION}"
fi

git add -A
git commit -m "$COMMIT_MSG

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push

echo -e "${GREEN}Pushed to GitHub${NC}"

# Step 3: Wait for Windows build
echo -e "\n${YELLOW}[3/5] Build on VOLTA now:${NC}"
echo -e "${CYAN}----------------------------------------${NC}"
echo -e "cd C:\\Users\\VOLTA\\cinny-desktop"
echo -e "git pull"
echo -e "npx tauri build"
echo -e "${CYAN}----------------------------------------${NC}"
echo ""
read -p "Press Enter when Windows build is complete..."

# Step 4: Deploy
echo -e "\n${GREEN}[4/5] Deploying update...${NC}"
./deploy-update.sh

# Step 5: Verify
echo -e "\n${GREEN}[5/5] Release complete!${NC}"
echo -e "Version ${VERSION} is now live at:"
echo -e "  ${CYAN}https://cinny-updates.endershare.org/update.json${NC}"
