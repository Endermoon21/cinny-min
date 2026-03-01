#!/bin/bash
# Full automated release workflow for Cinny-Min
# Runs entirely from WSL - builds on VOLTA via SSH
# Usage: ./release.sh [patch|minor|major|X.Y.Z] ["Release notes"]

set -e

# Configuration
VOLTA_HOST="sshuser@100.99.120.85"
VOLTA_PASS="1"
VOLTA_PROJECT="C:\\Users\\VOLTA\\cinny-desktop"
DOCKER_HOST="root@100.89.14.34"
DOCKER_PASS="lancache123"
UPDATE_SERVER_PATH="/opt/cinny-downloads"
TAURI_KEY_PATH="/opt/cinny-keys/tauri.key"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

cd "$(dirname "$0")"

VERSION_BUMP="${1:-patch}"
NOTES="${2:-}"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Cinny-Min Automated Release          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}\n"

# Step 1: Bump version
echo -e "${GREEN}[1/6] Bumping version...${NC}"
./bump-version.sh "$VERSION_BUMP"

VERSION=$(grep -o '"version": "[^"]*"' src-tauri/tauri.conf.json | head -1 | cut -d'"' -f4)
BUNDLE_NAME="Cinny-Min_${VERSION}_x64-setup.nsis.zip"

# Step 2: Commit and push
echo -e "\n${GREEN}[2/6] Committing and pushing to GitHub...${NC}"
if [ -n "$NOTES" ]; then
    COMMIT_MSG="$NOTES"
else
    COMMIT_MSG="release: v${VERSION}"
fi

git add -A
git commit -m "$COMMIT_MSG

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push

echo -e "Pushed to GitHub ✓"

# Step 3: Build on VOLTA via SSH (Windows PowerShell)
echo -e "\n${GREEN}[3/6] Building on VOLTA (this takes ~2-3 minutes)...${NC}"

# Run build on VOLTA using PowerShell
sshpass -p "$VOLTA_PASS" ssh -o StrictHostKeyChecking=no "$VOLTA_HOST" "powershell -Command \"
    Set-Location 'C:\\Users\\VOLTA\\cinny-desktop'
    git pull
    \$env:PATH = 'C:\\Users\\VOLTA\\.cargo\\bin;' + \$env:PATH
    npx tauri build
\"" 2>&1 | while IFS= read -r line; do
    # Show progress indicators
    if [[ "$line" == *"Compiling"* ]]; then
        echo -ne "\r${YELLOW}Compiling Rust...${NC}                              "
    elif [[ "$line" == *"Finished"* ]]; then
        echo -e "\r${GREEN}Rust build complete ✓${NC}                              "
    elif [[ "$line" == *"Building"* ]]; then
        echo -ne "\r${YELLOW}Building installer...${NC}                              "
    elif [[ "$line" == *"NSIS"* ]] || [[ "$line" == *"nsis"* ]]; then
        echo -ne "\r${YELLOW}Creating NSIS installer...${NC}                              "
    elif [[ "$line" == *"Finished"*"release"* ]]; then
        echo -e "\r${GREEN}Build finished ✓${NC}                              "
    fi
done

echo -e "${GREEN}Windows build complete ✓${NC}"

# Step 4: Pull bundle from VOLTA
echo -e "\n${GREEN}[4/6] Downloading bundle from VOLTA...${NC}"
TMP_BUNDLE="/tmp/${BUNDLE_NAME}"
sshpass -p "$VOLTA_PASS" scp -o StrictHostKeyChecking=no \
    "${VOLTA_HOST}:C:/Users/VOLTA/cinny-desktop/src-tauri/target/release/bundle/nsis/${BUNDLE_NAME}" "$TMP_BUNDLE"

if [ ! -f "$TMP_BUNDLE" ]; then
    echo -e "${RED}Error: Bundle not found. Build may have failed.${NC}"
    exit 1
fi

BUNDLE_SIZE=$(ls -lh "$TMP_BUNDLE" | awk '{print $5}')
echo -e "Downloaded: ${BUNDLE_SIZE} ✓"

# Step 5: Upload and sign on docker-host
echo -e "\n${GREEN}[5/6] Uploading and signing...${NC}"

# Upload
sshpass -p "$DOCKER_PASS" scp -o StrictHostKeyChecking=no \
    "$TMP_BUNDLE" "${DOCKER_HOST}:${UPDATE_SERVER_PATH}/"

# Sign
SIGN_OUTPUT=$(sshpass -p "$DOCKER_PASS" ssh -o StrictHostKeyChecking=no "$DOCKER_HOST" \
    "cd ${UPDATE_SERVER_PATH} && ~/.cargo/bin/cargo-tauri signer sign -f ${TAURI_KEY_PATH} -p '' ${BUNDLE_NAME} 2>&1")

SIGNATURE=$(echo "$SIGN_OUTPUT" | grep -A1 "Public signature:" | tail -1)
if [ -z "$SIGNATURE" ]; then
    echo -e "${RED}Error: Failed to sign bundle${NC}"
    echo "$SIGN_OUTPUT"
    exit 1
fi
echo -e "Signed ✓"

# Step 6: Update update.json
echo -e "\n${GREEN}[6/6] Updating release manifest...${NC}"
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Get release notes
if [ -n "$NOTES" ]; then
    RELEASE_NOTES="$NOTES"
else
    RELEASE_NOTES=$(git log -1 --pretty=%B | head -1)
fi
RELEASE_NOTES=$(echo "$RELEASE_NOTES" | sed 's/"/\\"/g')

sshpass -p "$DOCKER_PASS" ssh -o StrictHostKeyChecking=no "$DOCKER_HOST" "cat > ${UPDATE_SERVER_PATH}/update.json << 'JSONEOF'
{
  \"version\": \"${VERSION}\",
  \"notes\": \"${RELEASE_NOTES}\",
  \"pub_date\": \"${PUB_DATE}\",
  \"platforms\": {
    \"windows-x86_64\": {
      \"signature\": \"${SIGNATURE}\",
      \"url\": \"https://cinny-updates.endershare.org/${BUNDLE_NAME}\"
    }
  }
}
JSONEOF"

# Set permissions
sshpass -p "$DOCKER_PASS" ssh -o StrictHostKeyChecking=no "$DOCKER_HOST" \
    "chmod 644 ${UPDATE_SERVER_PATH}/${BUNDLE_NAME}*"

# Cleanup
rm -f "$TMP_BUNDLE"

# Done!
echo -e "\n${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ${GREEN}Release v${VERSION} Complete!${CYAN}            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo -e "\nUpdate live at: ${CYAN}https://cinny-updates.endershare.org/update.json${NC}"

# Quick verification
echo -e "\n${YELLOW}Verification:${NC}"
curl -s https://cinny-updates.endershare.org/update.json | grep -E '"version"|"notes"'
