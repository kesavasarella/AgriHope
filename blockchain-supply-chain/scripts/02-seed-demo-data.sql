-- Seed demo data for testing the agricultural supply chain system

-- Insert demo users for each role
INSERT INTO users (email, password_hash, role, name, phone, address, farm_id, license_number) VALUES
('farmer@demo.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'farmer', 'Ram Prasad', '+91-9876543210', 'Village Khandagiri, Bhubaneswar, Odisha', 'FARM-001', NULL),
('distributor@demo.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'distributor', 'Logistics Solutions Pvt Ltd', '+91-9876543211', 'Industrial Area, Bhubaneswar, Odisha', NULL, 'DIST-2024-001'),
('retailer@demo.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'retailer', 'Fresh Mart Supermarket', '+91-9876543212', 'Market Complex, Cuttack, Odisha', NULL, 'RET-2024-001'),
('consumer@demo.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'consumer', 'Priya Sharma', '+91-9876543213', 'Saheed Nagar, Bhubaneswar, Odisha', NULL, NULL),
('admin@demo.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'admin', 'System Administrator', '+91-9876543214', 'Government Complex, Bhubaneswar, Odisha', NULL, 'ADMIN-001');

-- Insert demo products
INSERT INTO products (product_id, farmer_id, crop_type, variety, harvest_date, quantity_kg, current_owner_id, current_status, qr_code, metadata_hash) VALUES
('AGR-OD-20250908-0001', 1, 'Tomato', 'Roma', '2025-09-08', 200.5, 1, 'harvested', 'QR-AGR-OD-20250908-0001-1725782400', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'),
('AGR-OD-20250908-0002', 1, 'Potato', 'Kufri Jyoti', '2025-09-07', 150.0, 2, 'dispatched', 'QR-AGR-OD-20250908-0002-1725782401', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567'),
('AGR-OD-20250908-0003', 1, 'Onion', 'Nasik Red', '2025-09-06', 300.0, 3, 'for_sale', 'QR-AGR-OD-20250908-0003-1725782402', 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678');

-- Insert demo product events
INSERT INTO product_events (product_id, actor_id, event_type, status, price, location, notes, metadata_hash) VALUES
('AGR-OD-20250908-0001', 1, 'created', 'harvested', NULL, 'Village Khandagiri, Bhubaneswar', 'Fresh harvest of Roma tomatoes', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'),
('AGR-OD-20250908-0002', 1, 'created', 'harvested', NULL, 'Village Khandagiri, Bhubaneswar', 'Quality Kufri Jyoti potatoes', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567'),
('AGR-OD-20250908-0002', 1, 'packed', 'packed', NULL, 'Village Khandagiri, Bhubaneswar', 'Packed in 25kg bags', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234568'),
('AGR-OD-20250908-0002', 2, 'received', 'dispatched', 45.50, 'Industrial Area, Bhubaneswar', 'Received by distributor for transport', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234569'),
('AGR-OD-20250908-0003', 1, 'created', 'harvested', NULL, 'Village Khandagiri, Bhubaneswar', 'Premium Nasik Red onions', 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678'),
('AGR-OD-20250908-0003', 1, 'packed', 'packed', NULL, 'Village Khandagiri, Bhubaneswar', 'Sorted and packed', 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345679'),
('AGR-OD-20250908-0003', 2, 'received', 'received', 35.75, 'Industrial Area, Bhubaneswar', 'Quality checked and accepted', 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a'),
('AGR-OD-20250908-0003', 3, 'received', 'for_sale', 42.00, 'Market Complex, Cuttack', 'Ready for retail sale', 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567b');

-- Insert demo quality certificates
INSERT INTO quality_certificates (product_id, certificate_type, value, unit, issued_by, issued_date, certificate_hash) VALUES
('AGR-OD-20250908-0001', 'Brix Level', '5.6', 'degrees', 'Odisha Agricultural Quality Board', '2025-09-08', 'cert1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'),
('AGR-OD-20250908-0001', 'Pesticide Residue', 'Below Detection Limit', 'ppm', 'State Food Testing Lab', '2025-09-08', 'cert2345678901bcdef2345678901bcdef2345678901bcdef2345678901bc'),
('AGR-OD-20250908-0002', 'Starch Content', '18.5', 'percentage', 'Potato Research Institute', '2025-09-07', 'cert3456789012cdef3456789012cdef3456789012cdef3456789012cd'),
('AGR-OD-20250908-0003', 'Moisture Content', '12.8', 'percentage', 'Vegetable Quality Assurance Lab', '2025-09-06', 'cert4567890123def4567890123def4567890123def4567890123de');

-- Insert demo metadata
INSERT INTO product_metadata (product_id, metadata_type, data, images, documents, hash) VALUES
('AGR-OD-20250908-0001', 'harvest', '{"weather": "sunny", "soil_ph": 6.5, "irrigation": "drip", "fertilizer": "organic"}', ARRAY['/images/tomato-harvest-1.jpg', '/images/tomato-field-1.jpg'], ARRAY['/docs/harvest-report-001.pdf'], 'meta1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
('AGR-OD-20250908-0002', 'harvest', '{"weather": "cloudy", "soil_ph": 6.8, "irrigation": "sprinkler", "fertilizer": "mixed"}', ARRAY['/images/potato-harvest-1.jpg'], ARRAY['/docs/harvest-report-002.pdf'], 'meta2345678901bcdef2345678901bcdef2345678901bcdef2345678901'),
('AGR-OD-20250908-0003', 'harvest', '{"weather": "partly_cloudy", "soil_ph": 7.0, "irrigation": "flood", "fertilizer": "organic"}', ARRAY['/images/onion-harvest-1.jpg', '/images/onion-sorting-1.jpg'], ARRAY['/docs/harvest-report-003.pdf'], 'meta3456789012cdef3456789012cdef3456789012cdef3456789012');
