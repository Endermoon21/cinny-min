#!/bin/bash
# Cinny-Min Update Deployment Script
# Automates: Pull from VOLTA -> Upload to docker-host -> Sign -> Update JSON -> GitHub Release

set -e

# Configuration
VOLTA_HOST="sshuser@100.99.120.85"
VOLTA_PASS="1"
DOCKER_HOST="root@100.89.14.34"
DOCKER_PASS="lancache123"
VOLTA_BUILD_PATH="C:/Users/VOLTA/cinny-desktop/src-tauri/target/release/bundle/msi"
UPDATE_SERVER_PATH="/opt/cinny-downloads"
MINISIGN_KEY_PATH="/opt/cinny-keys/minisign.key"
GITHUB_REPO="Endermoon21/cinny-min"

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

BUNDLE_NAME="Cinny-Min_${VERSION}_x64_en-US.msi.zip"
EXE_NAME="Cinny-Min_${VERSION}_x64_en-US.msi"
echo -e "${YELLOW}Deploying version: ${VERSION}${NC}"
echo -e "${YELLOW}Bundle: ${BUNDLE_NAME}${NC}"

# Step 1: Pull bundle and exe from VOLTA
echo -e "\n${GREEN}[1/5] Pulling bundle and exe from VOLTA...${NC}"
TMP_BUNDLE="/tmp/${BUNDLE_NAME}"
TMP_EXE="/tmp/${EXE_NAME}"
sshpass -p "$VOLTA_PASS" scp -o StrictHostKeyChecking=no \
    "${VOLTA_HOST}:${VOLTA_BUILD_PATH}/${BUNDLE_NAME}" "$TMP_BUNDLE"
sshpass -p "$VOLTA_PASS" scp -o StrictHostKeyChecking=no \
    "${VOLTA_HOST}:${VOLTA_BUILD_PATH}/${EXE_NAME}" "$TMP_EXE"

if [ ! -f "$TMP_BUNDLE" ]; then
    echo -e "${RED}Error: Failed to download bundle from VOLTA${NC}"
    exit 1
fi

if [ ! -f "$TMP_EXE" ]; then
    echo -e "${RED}Error: Failed to download exe from VOLTA${NC}"
    exit 1
fi

BUNDLE_SIZE=$(ls -lh "$TMP_BUNDLE" | awk '{print $5}')
EXE_SIZE=$(ls -lh "$TMP_EXE" | awk '{print $5}')
echo -e "Downloaded bundle: ${BUNDLE_SIZE}"
echo -e "Downloaded exe: ${EXE_SIZE}"

# Step 2: Upload to docker-host
echo -e "\n${GREEN}[2/5] Uploading to update server...${NC}"
sshpass -p "$DOCKER_PASS" scp -o StrictHostKeyChecking=no \
    "$TMP_BUNDLE" "${DOCKER_HOST}:${UPDATE_SERVER_PATH}/"

# Step 3: Sign the bundle
echo -e "\n${GREEN}[3/5] Signing bundle...${NC}"
# Sign using minisign with -l (legacy format) for Ed25519 compatibility
sshpass -p "$DOCKER_PASS" ssh -o StrictHostKeyChecking=no "$DOCKER_HOST" \
    "cd ${UPDATE_SERVER_PATH} && echo '' | minisign -Slm ${BUNDLE_NAME} -s ${MINISIGN_KEY_PATH} -t 'file:${BUNDLE_NAME}' 2>&1"

# Read the .minisig file and base64 encode it
SIGNATURE=$(sshpass -p "$DOCKER_PASS" ssh -o StrictHostKeyChecking=no "$DOCKER_HOST" \
    "cat ${UPDATE_SERVER_PATH}/${BUNDLE_NAME}.minisig | base64 -w0")

if [ -z "$SIGNATURE" ]; then
    echo -e "${RED}Error: Failed to read signature file${NC}"
    exit 1
fi

echo -e "Signature generated successfully"

# Step 4: Update update.json
echo -e "\n${GREEN}[4/5] Updating update.json...${NC}"
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

# Step 5: Create GitHub Release
echo -e "\n${GREEN}[5/5] Creating GitHub release...${NC}"
TAG_NAME="v${VERSION}"

# Check if release already exists
if gh release view "$TAG_NAME" --repo "$GITHUB_REPO" &>/dev/null; then
    echo -e "${YELLOW}Release ${TAG_NAME} already exists, updating...${NC}"
    gh release delete "$TAG_NAME" --repo "$GITHUB_REPO" --yes 2>/dev/null || true
fi

# Create release with exe
gh release create "$TAG_NAME" "$TMP_EXE" \
    --repo "$GITHUB_REPO" \
    --title "Cinny-Min ${VERSION}" \
    --notes "$NOTES" \
    --latest

echo -e "GitHub release created: https://github.com/${GITHUB_REPO}/releases/tag/${TAG_NAME}"

# Verify deployment
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "Version: ${VERSION}"
echo -e "URL: https://cinny-updates.endershare.org/${BUNDLE_NAME}"

# Verify update.json is accessible
echo -e "\n${YELLOW}Verifying update endpoint...${NC}"
curl -s https://cinny-updates.endershare.org/update.json | head -5

# Cleanup
rm -f "$TMP_BUNDLE" "$TMP_EXE"

echo -e "\n${GREEN}Done!${NC}"
