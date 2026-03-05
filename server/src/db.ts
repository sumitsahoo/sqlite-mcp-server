import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Define the database file path
const dbPath = path.resolve(import.meta.dirname, '../../database.sqlite');
const isNewDb = !fs.existsSync(dbPath);

console.log(`Using database at: ${dbPath}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Seed the database if it's new
if (isNewDb) {
    console.log('Initializing and seeding new database...');

    db.exec(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

    const insert = db.prepare(`
    INSERT INTO products (name, description, price, category, stock)
    VALUES (@name, @description, @price, @category, @stock)
  `);

    const seedProducts = [
        { name: 'Aurora Keyboard', description: 'Wireless mechanical keyboard with RGB backlighting', price: 129.99, category: 'Electronics', stock: 45 },
        { name: 'Nebula Mouse', description: 'Ergonomic wireless gaming mouse with high DPI', price: 79.99, category: 'Electronics', stock: 120 },
        { name: 'Zenith Monitor', description: '27-inch 4K UHD monitor with 144Hz refresh rate', price: 349.50, category: 'Computers', stock: 25 },
        { name: 'Nova Headphones', description: 'Noise-cancelling over-ear headphones', price: 199.00, category: 'Audio', stock: 60 },
        { name: 'Quantum Desk', description: 'Adjustable standing desk with bamboo top', price: 450.00, category: 'Furniture', stock: 15 },
        { name: 'Gravity Chair', description: 'Ergonomic office chair with lumbar support', price: 299.99, category: 'Furniture', stock: 30 },
        { name: 'Photon Webcam', description: '1080p HD webcam with built-in microphone', price: 59.99, category: 'Accessories', stock: 85 },
        { name: 'Pulse Earbuds', description: 'True wireless earbuds with charging case', price: 89.99, category: 'Audio', stock: 150 },
        { name: 'Stellar Backpack', description: 'Water-resistant laptop backpack with USB charging port', price: 45.00, category: 'Apparel', stock: 200 },
        { name: 'Comet Hub', description: '7-in-1 USB-C hub with HDMI, SD card reader, and USB ports', price: 35.50, category: 'Accessories', stock: 110 }
    ];

    const insertMany = db.transaction((products) => {
        for (const product of products) {
            insert.run(product);
        }
    });

    insertMany(seedProducts);
    console.log('Database seeded successfully with products.');
} else {
    console.log('Database already exists, skipping seed.');
}

export default db;
