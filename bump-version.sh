#!/bin/bash
# Bump version in tauri.conf.json and Cargo.toml

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get current version
CURRENT=$(grep -o '"version": "[^"]*"' src-tauri/tauri.conf.json | head -1 | cut -d'"' -f4)
echo -e "Current version: ${YELLOW}${CURRENT}${NC}"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# Determine new version based on argument
case "${1:-patch}" in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch|"")
        PATCH=$((PATCH + 1))
        ;;
    *)
        # If a specific version is provided, use it
        NEW_VERSION="$1"
        ;;
esac

NEW_VERSION="${NEW_VERSION:-$MAJOR.$MINOR.$PATCH}"
echo -e "New version: ${GREEN}${NEW_VERSION}${NC}"

# Update tauri.conf.json
sed -i "s/\"version\": \"${CURRENT}\"/\"version\": \"${NEW_VERSION}\"/" src-tauri/tauri.conf.json

# Update Cargo.toml
sed -i "s/^version = \"${CURRENT}\"/version = \"${NEW_VERSION}\"/" src-tauri/Cargo.toml

# Verify changes
echo -e "\n${GREEN}Updated files:${NC}"
grep "version" src-tauri/tauri.conf.json | head -1
grep "^version" src-tauri/Cargo.toml

echo -e "\n${YELLOW}Don't forget to commit: git add -A && git commit -m \"bump: v${NEW_VERSION}\"${NC}"
