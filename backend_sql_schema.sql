-- ==========================================
-- RATION DISTRIBUTION BACKEND DATABASE SCHEMA
-- Technology: PostgreSQL (recommended) / MySQL compatible
-- Purpose: Central server for syncing offline data and admin operations
-- ==========================================

-- ==========================================
-- 1. LOCATION HIERARCHY TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS states (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code)
);

CREATE TABLE IF NOT EXISTS districts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    state_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    population INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
    UNIQUE KEY unique_district (state_id, name),
    INDEX idx_code (code),
    INDEX idx_state (state_id)
);

CREATE TABLE IF NOT EXISTS taluks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    district_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_taluk (district_id, name),
    INDEX idx_code (code),
    INDEX idx_district (district_id)
);

CREATE TABLE IF NOT EXISTS villages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    taluk_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    location_code VARCHAR(50) NOT NULL UNIQUE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    population INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (taluk_id) REFERENCES taluks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_village (taluk_id, name),
    INDEX idx_code (code),
    INDEX idx_location_code (location_code),
    INDEX idx_taluk (taluk_id)
);

-- ==========================================
-- 2. ADMIN USER & ROLE MANAGEMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS admin_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admin_roles (name, description, permissions) VALUES
('STATE_ADMIN', 'State level admin with full access', '{"view_all": true, "manage_admins": true, "manage_inventory": true, "analytics": true}'),
('DISTRICT_ADMIN', 'District level admin', '{"view_district": true, "manage_logistics": true, "manage_local_admins": true}'),
('DISTRIBUTOR', 'Village level distributor', '{"distribute_rations": true, "view_local_data": true, "report_issues": true}');

CREATE TABLE IF NOT EXISTS admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role_id INT NOT NULL,
    assigned_village_id INT,
    assigned_district_id INT,
    device_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES admin_roles(id),
    FOREIGN KEY (assigned_village_id) REFERENCES villages(id),
    FOREIGN KEY (assigned_district_id) REFERENCES districts(id),
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role_id),
    INDEX idx_village (assigned_village_id),
    INDEX idx_active (is_active)
);

-- ==========================================
-- 3. RATION CARD & FAMILY MEMBERS
-- ==========================================

CREATE TABLE IF NOT EXISTS ration_cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ration_card_number VARCHAR(50) NOT NULL UNIQUE,
    village_id INT NOT NULL,
    head_name VARCHAR(150) NOT NULL,
    head_aadhaar VARCHAR(20) NOT NULL UNIQUE,
    ration_category ENUM('APL', 'BPL', 'AAY') DEFAULT 'APL',
    family_size INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE CASCADE,
    INDEX idx_card_number (ration_card_number),
    INDEX idx_village (village_id),
    INDEX idx_aadhaar (head_aadhaar),
    INDEX idx_active (is_active)
);

CREATE TABLE IF NOT EXISTS family_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ration_card_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    aadhaar_number VARCHAR(20) NOT NULL UNIQUE,
    age INT,
    relation VARCHAR(50),
    is_alive BOOLEAN DEFAULT TRUE,
    death_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ration_card_id) REFERENCES ration_cards(id) ON DELETE CASCADE,
    INDEX idx_ration_card (ration_card_id),
    INDEX idx_aadhaar (aadhaar_number),
    INDEX idx_alive (is_alive)
);

-- ==========================================
-- 4. GRAIN INVENTORY MANAGEMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS grains (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    unit VARCHAR(20) DEFAULT 'kg',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code)
);

INSERT INTO grains (name, code, unit, description) VALUES
('Rice (White)', 'RICE_WHITE', 'kg', 'White rice for public distribution'),
('Rice (Brown)', 'RICE_BROWN', 'kg', 'Brown rice for public distribution'),
('Wheat', 'WHEAT', 'kg', 'Whole wheat flour'),
('Jowar', 'JOWAR', 'kg', 'Jowar grain'),
('Dal', 'DAL', 'kg', 'Mixed pulses');

CREATE TABLE IF NOT EXISTS grain_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    village_id INT NOT NULL,
    grain_id INT NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'kg',
    price_per_unit DECIMAL(10, 2),
    total_value DECIMAL(15, 2),
    batch_id VARCHAR(100),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE CASCADE,
    FOREIGN KEY (grain_id) REFERENCES grains(id) ON DELETE CASCADE,
    UNIQUE KEY unique_stock (village_id, grain_id),
    INDEX idx_village (village_id),
    INDEX idx_grain (grain_id)
);

-- ==========================================
-- 5. LOGISTICS & SHIPMENT MANAGEMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS shipments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shipment_id VARCHAR(100) NOT NULL UNIQUE,
    grain_id INT NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    from_location VARCHAR(200),
    to_village_id INT NOT NULL,
    status ENUM('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED') DEFAULT 'PENDING',
    scheduled_date DATETIME,
    actual_delivery_date DATETIME NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (grain_id) REFERENCES grains(id),
    FOREIGN KEY (to_village_id) REFERENCES villages(id),
    FOREIGN KEY (created_by) REFERENCES admin_users(id),
    INDEX idx_shipment_id (shipment_id),
    INDEX idx_village (to_village_id),
    INDEX idx_status (status),
    INDEX idx_date (scheduled_date)
);

-- ==========================================
-- 6. DISTRIBUTION TRANSACTIONS (CORE)
-- ==========================================

CREATE TABLE IF NOT EXISTS distributions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    device_id VARCHAR(100) NOT NULL,
    ration_card_id INT NOT NULL,
    distributor_id INT NOT NULL,
    village_id INT NOT NULL,
    grain_id INT NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    distribution_date DATETIME NOT NULL,
    distribution_month INT,
    distribution_year INT,
    authenticated_member_name VARCHAR(150),
    authenticated_member_aadhaar VARCHAR(20),
    auth_status ENUM('SUCCESS', 'FAILED', 'PENDING') DEFAULT 'PENDING',
    auth_timestamp DATETIME,
    sync_status ENUM('PENDING', 'SYNCED', 'CONFLICT', 'FAILED') DEFAULT 'PENDING',
    sync_attempts INT DEFAULT 0,
    last_sync_attempt DATETIME NULL,
    conflict_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ration_card_id) REFERENCES ration_cards(id),
    FOREIGN KEY (distributor_id) REFERENCES admin_users(id),
    FOREIGN KEY (village_id) REFERENCES villages(id),
    FOREIGN KEY (grain_id) REFERENCES grains(id),
    UNIQUE KEY unique_transaction (transaction_id),
    INDEX idx_ration_card (ration_card_id),
    INDEX idx_distributor (distributor_id),
    INDEX idx_village (village_id),
    INDEX idx_date (distribution_date),
    INDEX idx_month_year (distribution_year, distribution_month),
    INDEX idx_sync_status (sync_status),
    INDEX idx_device (device_id),
    INDEX idx_transaction (transaction_id)
);

-- ==========================================
-- 7. DISTRIBUTION LOG FOR MONTHLY DEDUPLICATION
-- ==========================================

CREATE TABLE IF NOT EXISTS distribution_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ration_card_id INT NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    last_distribution_date DATETIME,
    total_quantity_distributed DECIMAL(15, 2) DEFAULT 0,
    distribution_count INT DEFAULT 0,
    sync_status ENUM('PENDING', 'SYNCED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ration_card_id) REFERENCES ration_cards(id) ON DELETE CASCADE,
    UNIQUE KEY unique_month (ration_card_id, month, year),
    INDEX idx_month_year (year, month),
    INDEX idx_ration_card (ration_card_id)
);

-- ==========================================
-- 8. SYNC QUEUE FOR OFFLINE SYNC
-- ==========================================

CREATE TABLE IF NOT EXISTS sync_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id VARCHAR(100) NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    action_type ENUM('CREATE', 'UPDATE', 'DELETE') DEFAULT 'CREATE',
    related_type VARCHAR(50),
    payload JSON NOT NULL,
    status ENUM('PENDING', 'SYNCED', 'FAILED', 'CONFLICT') DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    last_attempt DATETIME NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_timestamp DATETIME NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transaction (transaction_id),
    INDEX idx_device (device_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
);

-- ==========================================
-- 9. CONFLICT RESOLUTION TRACKING
-- ==========================================

CREATE TABLE IF NOT EXISTS conflicts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id VARCHAR(100) NOT NULL,
    ration_card_id INT,
    conflict_type ENUM('DUPLICATE_MONTH', 'DUPLICATE_TRANSACTION', 'SYNC_MISMATCH', 'MISSING_MEMBER') DEFAULT 'DUPLICATE_TRANSACTION',
    conflict_reason TEXT,
    original_transaction_id VARCHAR(100),
    conflicting_transaction_id VARCHAR(100),
    resolution_status ENUM('PENDING', 'MANUAL_REVIEW', 'RESOLVED', 'IGNORED') DEFAULT 'PENDING',
    resolved_by INT,
    resolved_at DATETIME NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ration_card_id) REFERENCES ration_cards(id),
    FOREIGN KEY (resolved_by) REFERENCES admin_users(id),
    INDEX idx_transaction (transaction_id),
    INDEX idx_ration_card (ration_card_id),
    INDEX idx_status (resolution_status),
    INDEX idx_created (created_at)
);

-- ==========================================
-- 10. COMPLAINTS & REPORTS
-- ==========================================

CREATE TABLE IF NOT EXISTS complaints (
    id INT PRIMARY KEY AUTO_INCREMENT,
    complaint_id VARCHAR(100) NOT NULL UNIQUE,
    complaint_type ENUM('DEAD_PERSON', 'FRAUD', 'DUPLICATE', 'EXPIRED', 'OTHER') DEFAULT 'OTHER',
    distributor_id INT NOT NULL,
    ration_card_id INT,
    member_name VARCHAR(150),
    member_aadhaar VARCHAR(20),
    message TEXT NOT NULL,
    evidence_url VARCHAR(500),
    status ENUM('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED') DEFAULT 'OPEN',
    priority ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    resolved_by INT,
    resolution_notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (distributor_id) REFERENCES admin_users(id),
    FOREIGN KEY (ration_card_id) REFERENCES ration_cards(id),
    FOREIGN KEY (resolved_by) REFERENCES admin_users(id),
    INDEX idx_complaint_id (complaint_id),
    INDEX idx_distributor (distributor_id),
    INDEX idx_ration_card (ration_card_id),
    INDEX idx_status (status),
    INDEX idx_type (complaint_type),
    INDEX idx_created (created_at)
);

-- ==========================================
-- 11. DEVICE METADATA & TRACKING
-- ==========================================

CREATE TABLE IF NOT EXISTS devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id VARCHAR(100) NOT NULL UNIQUE,
    device_name VARCHAR(150),
    assigned_admin_id INT,
    assigned_village_id INT,
    os VARCHAR(50),
    app_version VARCHAR(20),
    last_sync DATETIME NULL,
    sync_status ENUM('SYNCED', 'PENDING', 'FAILED', 'OFFLINE') DEFAULT 'OFFLINE',
    pending_transactions INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_admin_id) REFERENCES admin_users(id),
    FOREIGN KEY (assigned_village_id) REFERENCES villages(id),
    INDEX idx_device_id (device_id),
    INDEX idx_admin (assigned_admin_id),
    INDEX idx_village (assigned_village_id)
);

-- ==========================================
-- 12. ANALYTICS & AUDIT LOG
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT,
    action VARCHAR(200) NOT NULL,
    table_name VARCHAR(100),
    record_id INT,
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin_users(id),
    INDEX idx_admin (admin_id),
    INDEX idx_table (table_name),
    INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS analytics_daily (
    id INT PRIMARY KEY AUTO_INCREMENT,
    report_date DATE NOT NULL,
    village_id INT,
    district_id INT,
    total_distributions INT DEFAULT 0,
    total_quantity DECIMAL(15, 2) DEFAULT 0,
    total_beneficiaries INT DEFAULT 0,
    synced_count INT DEFAULT 0,
    conflict_count INT DEFAULT 0,
    complaints_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (village_id) REFERENCES villages(id),
    FOREIGN KEY (district_id) REFERENCES districts(id),
    UNIQUE KEY unique_daily (report_date, village_id),
    INDEX idx_date (report_date),
    INDEX idx_village (village_id)
);

-- ==========================================
-- STORED PROCEDURES FOR CRITICAL OPERATIONS
-- ==========================================

DELIMITER //

-- Check for duplicate distribution in same month
CREATE PROCEDURE check_duplicate_distribution(
    IN p_ration_card_id INT,
    IN p_month INT,
    IN p_year INT
)
BEGIN
    SELECT COUNT(*) as count
    FROM distributions
    WHERE ration_card_id = p_ration_card_id
    AND distribution_month = p_month
    AND distribution_year = p_year
    AND sync_status != 'CONFLICT';
END //

-- Record distribution and update logs
CREATE PROCEDURE record_distribution(
    IN p_transaction_id VARCHAR(100),
    IN p_device_id VARCHAR(100),
    IN p_ration_card_id INT,
    IN p_distributor_id INT,
    IN p_village_id INT,
    IN p_grain_id INT,
    IN p_quantity DECIMAL(15, 2),
    IN p_month INT,
    IN p_year INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 'ERROR' as status;
    END;
    
    START TRANSACTION;
    
    INSERT INTO distributions (
        transaction_id, device_id, ration_card_id, distributor_id,
        village_id, grain_id, quantity, distribution_date,
        distribution_month, distribution_year, sync_status
    ) VALUES (
        p_transaction_id, p_device_id, p_ration_card_id, p_distributor_id,
        p_village_id, p_grain_id, p_quantity, NOW(),
        p_month, p_year, 'PENDING'
    );
    
    INSERT INTO distribution_logs (
        ration_card_id, month, year, last_distribution_date,
        total_quantity_distributed, distribution_count
    ) VALUES (
        p_ration_card_id, p_month, p_year, NOW(), p_quantity, 1
    )
    ON DUPLICATE KEY UPDATE
        last_distribution_date = NOW(),
        total_quantity_distributed = total_quantity_distributed + p_quantity,
        distribution_count = distribution_count + 1;
    
    COMMIT;
    SELECT 'SUCCESS' as status;
END //

DELIMITER ;

-- ==========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX idx_dist_ration_month ON distributions(ration_card_id, distribution_year, distribution_month);
CREATE INDEX idx_dist_location_date ON distributions(village_id, distribution_date);
CREATE INDEX idx_dist_sync_status ON distributions(sync_status, created_at);
CREATE INDEX idx_sync_queue_pending ON sync_queue(status, created_at);
CREATE INDEX idx_complaint_status ON complaints(status, created_at);

-- ==========================================
-- DATABASE INITIALIZATION SCRIPT
-- ==========================================

-- Insert Karnataka as state
INSERT INTO states (name, code) VALUES ('Karnataka', 'KA')
ON DUPLICATE KEY UPDATE code='KA';

-- Note: Load districts, taluks, and villages from XLS file using migration script
-- See: load_location_data.js / load_location_data.py
