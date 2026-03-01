#!/bin/bash
# Cinny-Min Update Deployment Script
# Automates: Pull from VOLTA -> Upload to docker-host -> Sign -> Update JSON

set -e

# Configuration
VOLTA_HOST="sshuser@100.99.120.85"
VOLTA_PASS="1"
DOCKER_HOST="root@100.89.14.34"
DOCKER_PASS="lancache123"
VOLTA_BUILD_PATH="C:/Users/VOLTA/cinny-desktop/src-tauri/target/release/bundle/nsis"
UPDATE_SERVER_PATH="/opt/cinny-downloads"
TAURI_KEY_PATH="/opt/cinny-keys/tauri.key"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Cinny-Min Update Deployment ===${NC}"

# Get version from tauri.conf.json
VERSION=$(grep -o '"version": "[^"]*"' src-tauri/tauri.conf.json | head -1 | cut -d'"' -f4)
if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Could not determine version from tauri.conf.json${NC}"
    exit 1
fi

BUNDLE_NAME="Cinny-Min_${VERSION}_x64-setup.nsis.zip"
echo -e "${YELLOW}Deploying version: ${VERSION}${NC}"
echo -e "${YELLOW}Bundle: ${BUNDLE_NAME}${NC}"

# Step 1: Pull bundle from VOLTA
echo -e "\n${GREEN}[1/4] Pulling bundle from VOLTA...${NC}"
TMP_BUNDLE="/tmp/${BUNDLE_NAME}"
sshpass -p "$VOLTA_PASS" scp -o StrictHostKeyChecking=no \
    "${VOLTA_HOST}:${VOLTA_BUILD_PATH}/${BUNDLE_NAME}" "$TMP_BUNDLE"

if [ ! -f "$TMP_BUNDLE" ]; then
    echo -e "${RED}Error: Failed to download bundle from VOLTA${NC}"
    exit 1
fi

BUNDLE_SIZE=$(ls -lh "$TMP_BUNDLE" | awk '{print $5}')
echo -e "Downloaded: ${BUNDLE_SIZE}"

# Step 2: Upload to docker-host
echo -e "\n${GREEN}[2/4] Uploading to update server...${NC}"
sshpass -p "$DOCKER_PASS" scp -o StrictHostKeyChecking=no \
    "$TMP_BUNDLE" "${DOCKER_HOST}:${UPDATE_SERVER_PATH}/"

# Step 3: Sign the bundle
echo -e "\n${GREEN}[3/4] Signing bundle...${NC}"
SIGN_OUTPUT=$(sshpass -p "$DOCKER_PASS" ssh -o StrictHostKeyChecking=no "$DOCKER_HOST" \
    "cd ${UPDATE_SERVER_PATH} && ~/.cargo/bin/cargo-tauri signer sign -f ${TAURI_KEY_PATH} -p '' ${BUNDLE_NAME} 2>&1")

# Extract signature from output
SIGNATURE=$(echo "$SIGN_OUTPUT" | grep -A1 "Public signature:" | tail -1)
if [ -z "$SIGNATURE" ]; then
    echo -e "${RED}Error: Failed to extract signature${NC}"
    echo "$SIGN_OUTPUT"
    exit 1
fi

echo -e "Signature generated successfully"

# Step 4: Update update.json
echo -e "\n${GREEN}[4/4] Updating update.json...${NC}"
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Get release notes from git log (last commit message)
NOTES=$(git log -1 --pretty=%B | head -1)
# Escape special characters for JSON
NOTES=$(echo "$NOTES" | sed 's/"/\\"/g')

sshpass -p "$DOCKER_PASS" ssh -o StrictHostKeyChecking=no "$DOCKER_HOST" "cat > ${UPDATE_SERVER_PATH}/update.json << 'JSONEOF'
{
  \"version\": \"${VERSION}\",
  \"notes\": \"${NOTES}\",
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

# Verify deployment
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "Version: ${VERSION}"
echo -e "URL: https://cinny-updates.endershare.org/${BUNDLE_NAME}"

# Verify update.json is accessible
echo -e "\n${YELLOW}Verifying update endpoint...${NC}"
curl -s https://cinny-updates.endershare.org/update.json | head -5

# Cleanup
rm -f "$TMP_BUNDLE"

echo -e "\n${GREEN}Done!${NC}"
