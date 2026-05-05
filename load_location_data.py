#!/usr/bin/env python3
"""
Load Location Data from XLS File to Database
Script to import Karnataka districts, taluks, and villages from Excel file
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import mysql.connector
import argparse
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class LocationLoader:
    def __init__(self, db_type='postgresql', config=None):
        """
        Initialize database connection
        
        Args:
            db_type: 'postgresql' or 'mysql'
            config: Database configuration dict
        """
        self.db_type = db_type
        self.config = config or {}
        self.conn = None
        self.cursor = None
        self._connect()
    
    def _connect(self):
        """Connect to database based on type"""
        try:
            if self.db_type == 'postgresql':
                self.conn = psycopg2.connect(
                    host=self.config.get('host', 'localhost'),
                    port=self.config.get('port', 5432),
                    database=self.config.get('database', 'ration_db'),
                    user=self.config.get('user', 'postgres'),
                    password=self.config.get('password', '')
                )
            elif self.db_type == 'mysql':
                self.conn = mysql.connector.connect(
                    host=self.config.get('host', 'localhost'),
                    user=self.config.get('user', 'root'),
                    password=self.config.get('password', ''),
                    database=self.config.get('database', 'ration_db'),
                    port=self.config.get('port', 3306)
                )
            
            self.cursor = self.conn.cursor()
            logger.info(f"Connected to {self.db_type} database successfully")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def close(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("Database connection closed")
    
    def load_from_excel(self, file_path, sheet_name='Sheet1'):
        """
        Load location data from Excel file
        
        Expected columns in Excel:
        - District Name
        - Taluk Name
        - Village Name
        - Village Code
        - Latitude
        - Longitude
        (Optional: Population)
        """
        try:
            logger.info(f"Reading Excel file: {file_path}")
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Standardize column names (remove spaces, lowercase)
            df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
            
            logger.info(f"Loaded {len(df)} rows from Excel")
            logger.info(f"Columns: {df.columns.tolist()}")
            
            # Validate required columns
            required_columns = ['district_name', 'taluk_name', 'village_name', 'village_code']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            # Fill NaN values
            df = df.fillna({
                'latitude': 0.0,
                'longitude': 0.0,
                'population': 0
            })
            
            # Ensure state is Karnataka
            state_id = self._get_or_create_state('Karnataka', 'KA')
            
            # Process each row
            districts = {}
            taluks = {}
            
            for idx, row in df.iterrows():
                try:
                    district_name = row['district_name'].strip()
                    taluk_name = row['taluk_name'].strip()
                    village_name = row['village_name'].strip()
                    village_code = str(row['village_code']).strip()
                    
                    # Get or create district
                    if district_name not in districts:
                        district_code = district_name[:2].upper()
                        district_id = self._get_or_create_district(
                            state_id, 
                            district_name, 
                            district_code
                        )
                        districts[district_name] = district_id
                    else:
                        district_id = districts[district_name]
                    
                    # Get or create taluk
                    taluk_key = f"{district_name}_{taluk_name}"
                    if taluk_key not in taluks:
                        taluk_code = taluk_name[:2].upper()
                        taluk_id = self._get_or_create_taluk(
                            district_id, 
                            taluk_name, 
                            taluk_code
                        )
                        taluks[taluk_key] = taluk_id
                    else:
                        taluk_id = taluks[taluk_key]
                    
                    # Create village
                    location_code = f"KA-{district_name[:2].upper()}-{taluk_name[:2].upper()}-{village_code}"
                    
                    latitude = float(row.get('latitude', 0))
                    longitude = float(row.get('longitude', 0))
                    population = int(row.get('population', 0))
                    
                    self._create_village(
                        taluk_id,
                        village_name,
                        village_code,
                        location_code,
                        latitude,
                        longitude,
                        population
                    )
                    
                    if (idx + 1) % 100 == 0:
                        logger.info(f"Processed {idx + 1} rows...")
                
                except Exception as e:
                    logger.warning(f"Error processing row {idx + 1}: {e}")
                    continue
            
            self.conn.commit()
            logger.info(f"Successfully loaded {len(df)} locations")
            return True
        
        except Exception as e:
            logger.error(f"Error loading from Excel: {e}")
            self.conn.rollback()
            return False
    
    def _get_or_create_state(self, state_name, state_code):
        """Get or create state"""
        try:
            # Check if exists
            if self.db_type == 'postgresql':
                self.cursor.execute(
                    "SELECT id FROM states WHERE code = %s",
                    (state_code,)
                )
            else:
                self.cursor.execute(
                    "SELECT id FROM states WHERE code = %s",
                    (state_code,)
                )
            
            result = self.cursor.fetchone()
            if result:
                return result[0]
            
            # Create new
            if self.db_type == 'postgresql':
                self.cursor.execute(
                    """INSERT INTO states (name, code, created_at)
                       VALUES (%s, %s, %s) RETURNING id""",
                    (state_name, state_code, datetime.now())
                )
            else:
                self.cursor.execute(
                    """INSERT INTO states (name, code, created_at)
                       VALUES (%s, %s, %s)""",
                    (state_name, state_code, datetime.now())
                )
                self.cursor.execute("SELECT LAST_INSERT_ID()")
            
            state_id = self.cursor.fetchone()[0]
            logger.info(f"Created state: {state_name} (ID: {state_id})")
            return state_id
        except Exception as e:
            logger.error(f"Error creating state: {e}")
            raise
    
    def _get_or_create_district(self, state_id, district_name, district_code):
        """Get or create district"""
        try:
            if self.db_type == 'postgresql':
                self.cursor.execute(
                    "SELECT id FROM districts WHERE state_id = %s AND code = %s",
                    (state_id, district_code)
                )
            else:
                self.cursor.execute(
                    "SELECT id FROM districts WHERE state_id = %s AND code = %s",
                    (state_id, district_code)
                )
            
            result = self.cursor.fetchone()
            if result:
                return result[0]
            
            if self.db_type == 'postgresql':
                self.cursor.execute(
                    """INSERT INTO districts (state_id, name, code, created_at)
                       VALUES (%s, %s, %s, %s) RETURNING id""",
                    (state_id, district_name, district_code, datetime.now())
                )
            else:
                self.cursor.execute(
                    """INSERT INTO districts (state_id, name, code, created_at)
                       VALUES (%s, %s, %s, %s)""",
                    (state_id, district_name, district_code, datetime.now())
                )
                self.cursor.execute("SELECT LAST_INSERT_ID()")
            
            district_id = self.cursor.fetchone()[0]
            logger.info(f"Created district: {district_name}")
            return district_id
        except Exception as e:
            logger.error(f"Error creating district: {e}")
            raise
    
    def _get_or_create_taluk(self, district_id, taluk_name, taluk_code):
        """Get or create taluk"""
        try:
            if self.db_type == 'postgresql':
                self.cursor.execute(
                    "SELECT id FROM taluks WHERE district_id = %s AND code = %s",
                    (district_id, taluk_code)
                )
            else:
                self.cursor.execute(
                    "SELECT id FROM taluks WHERE district_id = %s AND code = %s",
                    (district_id, taluk_code)
                )
            
            result = self.cursor.fetchone()
            if result:
                return result[0]
            
            if self.db_type == 'postgresql':
                self.cursor.execute(
                    """INSERT INTO taluks (district_id, name, code, created_at)
                       VALUES (%s, %s, %s, %s) RETURNING id""",
                    (district_id, taluk_name, taluk_code, datetime.now())
                )
            else:
                self.cursor.execute(
                    """INSERT INTO taluks (district_id, name, code, created_at)
                       VALUES (%s, %s, %s, %s)""",
                    (district_id, taluk_name, taluk_code, datetime.now())
                )
                self.cursor.execute("SELECT LAST_INSERT_ID()")
            
            taluk_id = self.cursor.fetchone()[0]
            logger.info(f"Created taluk: {taluk_name}")
            return taluk_id
        except Exception as e:
            logger.error(f"Error creating taluk: {e}")
            raise
    
    def _create_village(self, taluk_id, village_name, village_code, location_code, 
                       latitude, longitude, population):
        """Create village"""
        try:
            if self.db_type == 'postgresql':
                self.cursor.execute(
                    """INSERT INTO villages (taluk_id, name, code, location_code, 
                                           latitude, longitude, population, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (code) DO NOTHING""",
                    (taluk_id, village_name, village_code, location_code, 
                     latitude, longitude, population, datetime.now())
                )
            else:
                self.cursor.execute(
                    """INSERT IGNORE INTO villages (taluk_id, name, code, location_code,
                                                   latitude, longitude, population, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (taluk_id, village_name, village_code, location_code,
                     latitude, longitude, population, datetime.now())
                )
        except Exception as e:
            logger.warning(f"Error creating village {village_name}: {e}")


def main():
    parser = argparse.ArgumentParser(
        description='Load location data from Excel to database'
    )
    parser.add_argument('--file', required=True, help='Path to Excel file')
    parser.add_argument('--sheet', default='Sheet1', help='Sheet name in Excel')
    parser.add_argument('--db-type', choices=['postgresql', 'mysql'], 
                       default='postgresql', help='Database type')
    parser.add_argument('--host', default='localhost', help='Database host')
    parser.add_argument('--port', type=int, help='Database port')
    parser.add_argument('--user', help='Database user')
    parser.add_argument('--password', help='Database password')
    parser.add_argument('--database', default='ration_db', help='Database name')
    
    args = parser.parse_args()
    
    # Build config
    config = {
        'host': args.host,
        'user': args.user,
        'password': args.password,
        'database': args.database,
    }
    if args.port:
        config['port'] = args.port
    
    # Load data
    loader = LocationLoader(db_type=args.db_type, config=config)
    try:
        success = loader.load_from_excel(args.file, args.sheet)
        if success:
            logger.info("✓ Location data loaded successfully!")
            exit(0)
        else:
            logger.error("✗ Failed to load location data")
            exit(1)
    finally:
        loader.close()


if __name__ == '__main__':
    main()
