#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    echo -e "${2}${1}${NC}"
}

# Load database configuration from .env file
if [ -f .env ]; then
    source .env
    DB_NAME=${DB_NAME:-"clothing_business"}
    DB_USER=${DB_USER:-"clothing_user"}
    DB_PASSWORD=${DB_PASSWORD:-"ClothingApp123!"}
else
    print_message "Error: .env file not found!" "$RED"
    exit 1
fi

# Backup directory setup
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Test database connection
if ! mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME" 2>/dev/null; then
    print_message "Error: Cannot connect to database. Please check credentials." "$RED"
    exit 1
fi

# Function to backup specific table
backup_table() {
    local table=$1
    print_message "Backing up table: $table..." "$YELLOW"
    
    # Backup as SQL
    if mysqldump -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" "$table" > "$BACKUP_DIR/${table}_${DATE}.sql" 2>/dev/null; then
        print_message "Table $table backed up successfully!" "$GREEN"
        
        # Export to CSV
        print_message "Exporting $table to CSV..." "$YELLOW"
        if mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM $table" 2>/dev/null | sed 's/\t/,/g' > "$BACKUP_DIR/${table}_${DATE}.csv"; then
            print_message "Table $table exported to CSV successfully!" "$GREEN"
        else
            print_message "Error exporting $table to CSV." "$RED"
        fi
    else
        print_message "Error backing up table $table." "$RED"
    fi
}

# Start backup process
print_message "Starting full database backup..." "$YELLOW"

# Backup entire database
if mysqldump -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_DIR/full_backup_${DATE}.sql" 2>/dev/null; then
    print_message "Full database backup completed successfully!" "$GREEN"
    
    # Backup individual tables
    tables=("inventory" "orders" "payments" "financial_summary")
    for table in "${tables[@]}"; do
        backup_table "$table"
    done
    
    # Create zip archive
    if zip -r "$BACKUP_DIR/backup_${DATE}.zip" "$BACKUP_DIR"/*.sql "$BACKUP_DIR"/*.csv 2>/dev/null; then
        print_message "Backup archive created successfully!" "$GREEN"
        print_message "Backup files are located in: $BACKUP_DIR/backup_${DATE}.zip" "$GREEN"
        
        # Clean up individual files
        rm "$BACKUP_DIR"/*.sql "$BACKUP_DIR"/*.csv
    else
        print_message "Error creating backup archive." "$RED"
    fi
else
    print_message "Error performing full database backup." "$RED"
    exit 1
fi

# Create backup summary
cat > "$BACKUP_DIR/backup_summary_${DATE}.txt" << EOF
Backup Summary - $(date)
Database: $DB_NAME
Backup Date: $(date)
Tables Backed Up:
$(printf '%s\n' "${tables[@]}" | sed 's/^/- /')
EOF

print_message "Backup summary created: $BACKUP_DIR/backup_summary_${DATE}.txt" "$GREEN" 