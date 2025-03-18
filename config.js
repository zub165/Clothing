// Database Configuration
const dbConfig = {
    mysql: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'clothing_business',
        port: process.env.DB_PORT || 3306
    },
    mongodb: {
        url: process.env.MONGODB_URL || 'mongodb://localhost:27017/clothing_business',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    }
};

// API Configuration
const apiConfig = {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000']
};

module.exports = {
    dbConfig,
    apiConfig
}; 