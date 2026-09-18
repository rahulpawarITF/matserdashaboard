#!/bin/bash
# MongoDB Restore Script
# Usage: ./scripts/restore-mongo.sh <backup_file.tar.gz>

set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/restore-mongo.sh <backup_file.tar.gz>"
    exit 1
fi

BACKUP_FILE=$1
CONTAINER_NAME="masterdashboard-mongo-1"
DB_NAME="masterdashboard"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "[$(date)] Starting MongoDB restore from $BACKUP_FILE..."

# Extract the archive
TMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TMP_DIR"

# Find the extracted mongodump directory
EXTRACTED_DIR=$(find "$TMP_DIR" -maxdepth 1 -type d -name "mongodump_*")

if [ -z "$EXTRACTED_DIR" ]; then
    echo "Error: Could not find mongodump directory in archive"
    rm -rf "$TMP_DIR"
    exit 1
fi

# Copy to container
echo "[$(date)] Copying data to container..."
docker cp "$EXTRACTED_DIR" "$CONTAINER_NAME:/tmp/restore_data"

# Restore in container
echo "[$(date)] Restoring data..."
docker exec "$CONTAINER_NAME" mongorestore --db "$DB_NAME" --drop "/tmp/restore_data/$DB_NAME"

# Cleanup
echo "[$(date)] Cleaning up..."
docker exec "$CONTAINER_NAME" rm -rf "/tmp/restore_data"
rm -rf "$TMP_DIR"

echo "[$(date)] Restore completed successfully!"
