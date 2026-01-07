#!/bin/bash

# Mniqlo One-Click Start Script

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Mniqlo Setup & Launch...${NC}"

# 0. Try to load NVM (Node Version Manager)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
	echo -e "${BLUE}ℹ️  Loading NVM...${NC}"
	. "$NVM_DIR/nvm.sh"
elif [ -s "/usr/local/nvm/nvm.sh" ]; then
	echo -e "${BLUE}ℹ️  Loading NVM from /usr/local/nvm...${NC}"
	. "/usr/local/nvm/nvm.sh"
fi

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node -v)${NC}"

# 2. Check for .env
if [ ! -f ".env" ]; then
    echo -e "${RED}⚠️  .env file not found!${NC}"
    if [ -f ".env.example" ]; then
        echo -e "${BLUE}ℹ️  Creating .env from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✅ .env created. PLEASE EDIT IT with your credentials before running again if needed.${NC}"
    fi
fi

# 3. Install Dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}✅ Dependencies already installed.${NC}"
fi

# 4. Build Project
echo -e "${BLUE}🏗️  Building project...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# 5. Start Server
echo -e "${GREEN}🟢 Starting server...${NC}"
echo -e "${BLUE}ℹ️  Application will be available at http://localhost:3000${NC}"
npm start
