// src/index.ts

import dotenv from 'dotenv';
import path from 'path';


const resolvedEnvPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../.env')
  : path.join(__dirname, '../.env.local');

dotenv.config({path: resolvedEnvPath});

console.log(`Loaded env: ${resolvedEnvPath}`);
console.log(`loaded DB_URL: ${process.env.DATABASE_URL}`);


// application entry point

import app from './app';
import prisma from './config/prismaClient';

prisma.$connect()
  .then(() => {
    console.log('✅ Connected to the database successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1); // Exit the process if the database connection fails 
  });


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Chatterly backend is live on http://localhost:${PORT}`);
});

