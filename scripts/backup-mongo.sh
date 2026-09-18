#!/bin/bash
# MongoDB Backup Script
# Usage: ./scripts/backup-mongo.sh
# Recommend running via cron: 0 2 * * * /path/to/backup-mongo.sh

set -e

BACKUP_DIR="/var/backups/masterdashboard/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="masterdashboard-mongo-1"
DB_NAME="masterdashboard"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting MongoDB backup..."

# Dump from running Docker container
docker exec $CONTAINER_NAME mongodump \
    --db "$DB_NAME" \
    --out "/tmp/mongodump_$DATE"

# Copy from container
docker cp "$CONTAINER_NAME:/tmp/mongodump_$DATE" "$BACKUP_DIR/"

# Compress
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "mongodump_$DATE"
rm -rf "$BACKUP_DIR/mongodump_$DATE"

# Cleanup inside container
docker exec $CONTAINER_NAME rm -rf "/tmp/mongodump_$DATE"

# Remove old backups
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup completed: $BACKUP_DIR/backup_$DATE.tar.gz"
