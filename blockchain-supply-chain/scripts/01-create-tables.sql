-- Create database tables for the agricultural supply chain system
-- This simulates the blockchain data structure in a traditional database

-- Users table for authentication and role management
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('farmer', 'distributor', 'retailer', 'consumer', 'admin')),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    farm_id VARCHAR(100), -- For farmers
    license_number VARCHAR(100), -- For distributors/retailers
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table - represents the main blockchain product records
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(100) UNIQUE NOT NULL, -- Blockchain-style ID like AGR-OD-20250908-0001
    farmer_id INTEGER REFERENCES users(id),
    crop_type VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    harvest_date DATE NOT NULL,
    quantity_kg DECIMAL(10,2) NOT NULL,
    current_owner_id INTEGER REFERENCES users(id),
    current_status VARCHAR(50) DEFAULT 'harvested' CHECK (
        current_status IN ('harvested', 'packed', 'dispatched', 'received', 'for_sale', 'sold', 'dispute')
    ),
    qr_code VARCHAR(255) UNIQUE, -- QR code identifier
    metadata_hash VARCHAR(64), -- Simulates blockchain hash
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product events table - simulates blockchain transaction history
CREATE TABLE IF NOT EXISTS product_events (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(100) REFERENCES products(product_id),
    actor_id INTEGER REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL CHECK (
        event_type IN ('created', 'packed', 'dispatched', 'received', 'listed', 'sold', 'quality_check', 'dispute_raised')
    ),
    status VARCHAR(50) NOT NULL,
    price DECIMAL(10,2), -- Price at this event
    location VARCHAR(255),
    notes TEXT,
    metadata_hash VARCHAR(64), -- Hash of off-chain data
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quality certificates table
CREATE TABLE IF NOT EXISTS quality_certificates (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(100) REFERENCES products(product_id),
    certificate_type VARCHAR(100) NOT NULL, -- e.g., 'Brix', 'Pesticide Test', 'Organic'
    value VARCHAR(100),
    unit VARCHAR(50),
    issued_by VARCHAR(255),
    issued_date DATE NOT NULL,
    certificate_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Off-chain metadata table (simulates IPFS storage)
CREATE TABLE IF NOT EXISTS product_metadata (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(100) REFERENCES products(product_id),
    metadata_type VARCHAR(50) NOT NULL, -- 'harvest', 'transport', 'quality', etc.
    data JSONB NOT NULL, -- Store flexible metadata as JSON
    images TEXT[], -- Array of image URLs
    documents TEXT[], -- Array of document URLs
    hash VARCHAR(64) UNIQUE NOT NULL, -- Content hash
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_farmer_id ON products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_current_owner ON products(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(current_status);
CREATE INDEX IF NOT EXISTS idx_product_events_product_id ON product_events(product_id);
CREATE INDEX IF NOT EXISTS idx_product_events_actor ON product_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_quality_certificates_product_id ON quality_certificates(product_id);
CREATE INDEX IF NOT EXISTS idx_product_metadata_product_id ON product_metadata(product_id);
