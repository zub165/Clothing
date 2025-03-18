const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const excel = require('exceljs');
const upload = require('multer')();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load environment variables
require('dotenv').config();

// Create MySQL connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'clothing_user',
    password: process.env.DB_PASSWORD || 'ClothingApp123!',
    database: process.env.DB_NAME || 'clothing_business'
});

// Connect to database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database');
});

// Get database status
app.get('/api/status', (req, res) => {
    connection.query('SHOW TABLES', (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json({
            status: 'connected',
            tables: results.length,
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'clothing_business',
            user: process.env.DB_USER || 'clothing_user'
        });
    });
});

// Get table information
app.get('/api/tables', (req, res) => {
    const query = `
        SELECT 
            table_name as name,
            table_rows as records,
            data_length + index_length as size,
            update_time as lastUpdated
        FROM 
            information_schema.tables
        WHERE 
            table_schema = ?
    `;
    
    connection.query(query, [process.env.DB_NAME], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(results);
    });
});

// Get table contents
app.get('/api/table/:name', (req, res) => {
    const tableName = req.params.name;
    connection.query(`SELECT * FROM ${tableName}`, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(results);
    });
});

// Create backup
app.post('/api/backup', (req, res) => {
    const backupDir = path.join(__dirname, 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(backupDir, filename);

    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    // Execute mysqldump command
    const command = `mysqldump -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > ${filepath}`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Backup failed' });
            return;
        }
        
        const stats = fs.statSync(filepath);
        res.json({
            filename,
            size: stats.size,
            date: new Date(),
            status: 'completed'
        });
    });
});

// Restore backup
app.post('/api/restore', (req, res) => {
    const { filename } = req.body;
    const filepath = path.join(__dirname, 'backups', filename);

    if (!fs.existsSync(filepath)) {
        res.status(404).json({ error: 'Backup file not found' });
        return;
    }

    const command = `mysql -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} < ${filepath}`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Restore failed' });
            return;
        }
        res.json({ status: 'completed' });
    });
});

// Reset database
app.post('/api/reset', (req, res) => {
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
        res.status(404).json({ error: 'Schema file not found' });
        return;
    }

    const command = `mysql -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} < ${schemaPath}`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Reset failed' });
            return;
        }
        res.json({ status: 'completed' });
    });
});

// Get backup history
app.get('/api/backups', (req, res) => {
    const backupDir = path.join(__dirname, 'backups');
    
    if (!fs.existsSync(backupDir)) {
        res.json([]);
        return;
    }

    const backups = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => {
            const stats = fs.statSync(path.join(backupDir, file));
            return {
                filename: file,
                size: stats.size,
                date: stats.mtime,
                status: 'completed'
            };
        })
        .sort((a, b) => b.date - a.date);

    res.json(backups);
});

// Download backup
app.get('/api/backup/:filename', (req, res) => {
    const filepath = path.join(__dirname, 'backups', req.params.filename);
    
    if (!fs.existsSync(filepath)) {
        res.status(404).json({ error: 'Backup file not found' });
        return;
    }

    res.download(filepath);
});

// SQL Query Execution
app.post('/api/execute-query', (req, res) => {
    const { query } = req.body;
    
    // Basic SQL injection prevention
    if (query.toLowerCase().includes('drop') || 
        query.toLowerCase().includes('delete') ||
        query.toLowerCase().includes('truncate')) {
        res.status(403).json({ error: 'Operation not allowed' });
        return;
    }
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(results);
    });
});

// Chart Data API
app.get('/api/chart-data/:source', (req, res) => {
    const source = req.params.source;
    let query = '';
    
    switch(source) {
        case 'inventory':
            query = `
                SELECT name as label, stock as value 
                FROM inventory 
                ORDER BY stock DESC 
                LIMIT 10
            `;
            break;
            
        case 'orders':
            query = `
                SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as label, 
                       COUNT(*) as value 
                FROM orders 
                GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
                ORDER BY created_at DESC 
                LIMIT 10
            `;
            break;
            
        case 'payments':
            query = `
                SELECT status as label, 
                       COUNT(*) as value 
                FROM payments 
                GROUP BY status
            `;
            break;
            
        case 'financial':
            query = `
                SELECT 'Revenue' as label, total_revenue as value 
                FROM financial_summary
                UNION
                SELECT 'Expenses' as label, total_expenses as value 
                FROM financial_summary
                UNION
                SELECT 'Profit' as label, net_profit as value 
                FROM financial_summary
            `;
            break;
            
        default:
            res.status(400).json({ error: 'Invalid data source' });
            return;
    }
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching chart data:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        
        const labels = results.map(row => row.label);
        const values = results.map(row => row.value);
        
        res.json({
            labels,
            values,
            label: `${source.charAt(0).toUpperCase() + source.slice(1)} Data`
        });
    });
});

// Excel Export
app.get('/api/export-excel', (req, res) => {
    const workbook = new excel.Workbook();
    
    // Export each table
    Promise.all([
        exportTable(workbook, 'Inventory', 'SELECT * FROM inventory'),
        exportTable(workbook, 'Orders', 'SELECT * FROM orders'),
        exportTable(workbook, 'Payments', 'SELECT * FROM payments'),
        exportTable(workbook, 'Financial_Summary', 'SELECT * FROM financial_summary')
    ])
    .then(() => {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=database_export.xlsx');
        
        workbook.xlsx.write(res)
            .then(() => {
                res.end();
            })
            .catch(err => {
                console.error('Error writing Excel:', err);
                res.status(500).json({ error: 'Export failed' });
            });
    })
    .catch(err => {
        console.error('Error exporting tables:', err);
        res.status(500).json({ error: 'Export failed' });
    });
});

function exportTable(workbook, tableName, query) {
    return new Promise((resolve, reject) => {
        connection.query(query, (err, results) => {
            if (err) {
                reject(err);
                return;
            }
            
            const worksheet = workbook.addWorksheet(tableName);
            
            if (results.length > 0) {
                // Add headers
                const headers = Object.keys(results[0]);
                worksheet.addRow(headers);
                
                // Add data
                results.forEach(row => {
                    worksheet.addRow(Object.values(row));
                });
            }
            
            resolve();
        });
    });
}

// Excel Import
app.post('/api/import-excel', upload.single('file'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    
    const workbook = new excel.Workbook();
    workbook.xlsx.readFile(req.file.path)
        .then(() => {
            const promises = [];
            
            workbook.worksheets.forEach(worksheet => {
                const tableName = worksheet.name;
                const rows = worksheet.getSheetValues();
                
                if (rows.length < 2) return; // Skip empty sheets
                
                const headers = rows[1]; // First row is headers
                const data = rows.slice(2); // Rest are data
                
                data.forEach(row => {
                    const values = {};
                    headers.forEach((header, index) => {
                        values[header] = row[index];
                    });
                    
                    promises.push(
                        new Promise((resolve, reject) => {
                            connection.query(`INSERT INTO ${tableName} SET ?`, values, (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        })
                    );
                });
            });
            
            Promise.all(promises)
                .then(() => {
                    fs.unlink(req.file.path, () => {
                        res.json({ message: 'Import successful' });
                    });
                })
                .catch(err => {
                    console.error('Error importing data:', err);
                    res.status(500).json({ error: 'Import failed' });
                });
        })
        .catch(err => {
            console.error('Error reading Excel file:', err);
            res.status(500).json({ error: 'Import failed' });
        });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 