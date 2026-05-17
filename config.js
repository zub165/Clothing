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
    port: process.env.PORT || 3100,
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    corsOrigins: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
        : [
            'http://localhost:3100',
            'http://localhost:5180',
            'http://127.0.0.1:5180',
            'https://zub165.github.io',
          ]
};

module.exports = {
    dbConfig,
    apiConfig
}; 