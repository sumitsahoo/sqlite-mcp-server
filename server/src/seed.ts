import type Database from "better-sqlite3";

export function seed(db: Database.Database) {
  console.log("Initializing and seeding new database...");

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
    // iPhone
    {
      name: "iPhone 16 Pro Max",
      description: "6.9-inch Super Retina XDR display, A18 Pro chip, 48MP camera system",
      price: 1199.0,
      category: "iPhone",
      stock: 150,
    },
    {
      name: "iPhone 16 Pro",
      description: "6.3-inch Super Retina XDR display, A18 Pro chip, 48MP camera system",
      price: 999.0,
      category: "iPhone",
      stock: 200,
    },
    {
      name: "iPhone 16",
      description: "6.1-inch Super Retina XDR display, A18 chip, 48MP camera",
      price: 799.0,
      category: "iPhone",
      stock: 300,
    },
    {
      name: "iPhone 16 Plus",
      description: "6.7-inch Super Retina XDR display, A18 chip, 48MP camera",
      price: 899.0,
      category: "iPhone",
      stock: 250,
    },
    {
      name: "iPhone SE",
      description: "4.7-inch Retina HD display, A15 Bionic chip, 12MP camera",
      price: 429.0,
      category: "iPhone",
      stock: 400,
    },
    // Mac
    {
      name: "MacBook Air 13-inch M4",
      description: "13.6-inch Liquid Retina display, Apple M4 chip, 18-hour battery",
      price: 1099.0,
      category: "Mac",
      stock: 120,
    },
    {
      name: "MacBook Air 15-inch M4",
      description: "15.3-inch Liquid Retina display, Apple M4 chip, 18-hour battery",
      price: 1299.0,
      category: "Mac",
      stock: 100,
    },
    {
      name: "MacBook Pro 14-inch M4 Pro",
      description: "14.2-inch Liquid Retina XDR display, Apple M4 Pro chip, 24GB unified memory",
      price: 1999.0,
      category: "Mac",
      stock: 80,
    },
    {
      name: "MacBook Pro 16-inch M4 Max",
      description: "16.2-inch Liquid Retina XDR display, Apple M4 Max chip, 36GB unified memory",
      price: 3499.0,
      category: "Mac",
      stock: 50,
    },
    {
      name: "iMac 24-inch M4",
      description: "24-inch 4.5K Retina display, Apple M4 chip, 8-core GPU",
      price: 1299.0,
      category: "Mac",
      stock: 90,
    },
    {
      name: "Mac Mini M4",
      description: "Compact desktop with Apple M4 chip, 16GB unified memory",
      price: 599.0,
      category: "Mac",
      stock: 150,
    },
    {
      name: "Mac Studio M4 Max",
      description: "High-performance desktop with Apple M4 Max chip, 36GB unified memory",
      price: 1999.0,
      category: "Mac",
      stock: 40,
    },
    {
      name: "Mac Pro M2 Ultra",
      description: "Workstation desktop with Apple M2 Ultra chip, 192GB unified memory support",
      price: 6999.0,
      category: "Mac",
      stock: 20,
    },
    // iPad
    {
      name: "iPad Pro 13-inch M4",
      description: "13-inch Ultra Retina XDR display, Apple M4 chip, Thunderbolt/USB 4",
      price: 1299.0,
      category: "iPad",
      stock: 100,
    },
    {
      name: "iPad Pro 11-inch M4",
      description: "11-inch Ultra Retina XDR display, Apple M4 chip, Thunderbolt/USB 4",
      price: 999.0,
      category: "iPad",
      stock: 130,
    },
    {
      name: "iPad Air 13-inch M3",
      description: "13-inch Liquid Retina display, Apple M3 chip, USB-C",
      price: 799.0,
      category: "iPad",
      stock: 110,
    },
    {
      name: "iPad Air 11-inch M3",
      description: "11-inch Liquid Retina display, Apple M3 chip, USB-C",
      price: 599.0,
      category: "iPad",
      stock: 160,
    },
    {
      name: "iPad 10th generation",
      description: "10.9-inch Liquid Retina display, A14 Bionic chip, USB-C",
      price: 349.0,
      category: "iPad",
      stock: 250,
    },
    {
      name: "iPad mini A17 Pro",
      description: "8.3-inch Liquid Retina display, A17 Pro chip, USB-C",
      price: 499.0,
      category: "iPad",
      stock: 180,
    },
    // Apple Watch
    {
      name: "Apple Watch Ultra 2",
      description: "49mm titanium case, precision dual-frequency GPS, up to 36-hour battery",
      price: 799.0,
      category: "Apple Watch",
      stock: 70,
    },
    {
      name: "Apple Watch Series 10",
      description: "46mm or 42mm, always-on Retina display, health and fitness tracking",
      price: 399.0,
      category: "Apple Watch",
      stock: 200,
    },
    {
      name: "Apple Watch SE",
      description: "44mm or 40mm, fitness and health tracking, crash detection",
      price: 249.0,
      category: "Apple Watch",
      stock: 300,
    },
    // AirPods
    {
      name: "AirPods Pro 2",
      description: "Active Noise Cancellation, Adaptive Audio, USB-C charging case",
      price: 249.0,
      category: "AirPods",
      stock: 350,
    },
    {
      name: "AirPods 4",
      description: "Open-ear design, personalized Spatial Audio, USB-C charging",
      price: 129.0,
      category: "AirPods",
      stock: 400,
    },
    {
      name: "AirPods Max",
      description: "Over-ear headphones, Active Noise Cancellation, USB-C, 20-hour battery",
      price: 549.0,
      category: "AirPods",
      stock: 80,
    },
    // Apple TV & HomePod
    {
      name: "Apple TV 4K",
      description: "A15 Bionic chip, 4K HDR, Dolby Vision, Dolby Atmos, 128GB storage",
      price: 149.0,
      category: "Apple TV",
      stock: 200,
    },
    {
      name: "HomePod",
      description: "High-fidelity smart speaker with Spatial Audio and Siri",
      price: 299.0,
      category: "HomePod",
      stock: 100,
    },
    {
      name: "HomePod mini",
      description: "Compact smart speaker with Siri and room-filling sound",
      price: 99.0,
      category: "HomePod",
      stock: 250,
    },
    // Vision Pro
    {
      name: "Apple Vision Pro",
      description: "Spatial computer with visionOS, M2 chip, R1 chip, micro-OLED displays",
      price: 3499.0,
      category: "Vision Pro",
      stock: 30,
    },
    // Accessories
    {
      name: "Apple Pencil Pro",
      description: "Precision stylus with squeeze gesture, barrel roll, and haptic feedback",
      price: 129.0,
      category: "Accessories",
      stock: 200,
    },
    {
      name: "Magic Keyboard with Touch ID",
      description: "Wireless keyboard with Touch ID for Mac",
      price: 199.0,
      category: "Accessories",
      stock: 150,
    },
    {
      name: "Magic Mouse",
      description: "Wireless and rechargeable with Multi-Touch surface",
      price: 99.0,
      category: "Accessories",
      stock: 180,
    },
    {
      name: "Magic Trackpad",
      description: "Wireless Multi-Touch trackpad with Force Touch",
      price: 149.0,
      category: "Accessories",
      stock: 120,
    },
    {
      name: "AirTag",
      description: "Precision finding with Ultra Wideband, replaceable battery",
      price: 29.0,
      category: "Accessories",
      stock: 500,
    },
    {
      name: "MagSafe Charger",
      description: "Wireless charger with perfectly aligned magnets for iPhone",
      price: 39.0,
      category: "Accessories",
      stock: 400,
    },
    {
      name: "Apple Studio Display",
      description: "27-inch 5K Retina display, 12MP Ultra Wide camera, six-speaker sound system",
      price: 1599.0,
      category: "Accessories",
      stock: 40,
    },
    {
      name: "Pro Display XDR",
      description: "32-inch 6K Retina display, 1600 nits peak brightness, P3 wide color",
      price: 4999.0,
      category: "Accessories",
      stock: 15,
    },
  ];

  const insertMany = db.transaction((products) => {
    for (const product of products) {
      insert.run(product);
    }
  });

  insertMany(seedProducts);
  console.log("Database seeded successfully with products.");
}
