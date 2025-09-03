#!/bin/bash

# ResumeRadar Deployment Script
# This script helps deploy ResumeRadar to a production environment

set -e

echo "🚀 Starting ResumeRadar Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your production values before continuing."
    exit 1
fi

# Build the application
print_status "Building ResumeRadar..."
docker-compose build

# Start the services
print_status "Starting services..."
docker-compose up -d

# Wait for services to be healthy
print_status "Waiting for services to start..."
sleep 10

# Check if the application is running
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "✅ ResumeRadar is running successfully!"
    print_status "🌐 Application URL: http://localhost:3000"
    print_status "📊 Check logs with: docker-compose logs -f"
    print_status "🛑 Stop with: docker-compose down"
else
    print_error "❌ Application failed to start. Check logs with: docker-compose logs"
    exit 1
fi

echo ""
print_status "🎉 Deployment completed successfully!"
