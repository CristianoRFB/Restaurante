-- FOOD / CONDADO — isolated non-official staging
CREATE TABLE IF NOT EXISTS tenants(id TEXT PRIMARY KEY,display_name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,vertical TEXT NOT NULL DEFAULT 'FOOD',contract_status TEXT NOT NULL DEFAULT 'NOT_SIGNED',publication_status TEXT NOT NULL DEFAULT 'PREVIEW',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO tenants(id,display_name,slug) VALUES('condado-demo','Condado Livraria & Café','condado');
CREATE TABLE IF NOT EXISTS reservations(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,guest_name TEXT NOT NULL,phone TEXT NOT NULL,party_size INTEGER NOT NULL,visit_date TEXT NOT NULL,visit_time TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'SOLICITADA',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,table_number INTEGER);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,items_json TEXT NOT NULL,total_cents INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'NOVO',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,table_number INTEGER,tab_id TEXT);
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,ip_hash TEXT NOT NULL,kind TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS service_tables(tenant_id TEXT NOT NULL,table_number INTEGER NOT NULL CHECK(table_number BETWEEN 1 AND 4),active INTEGER NOT NULL DEFAULT 1,label TEXT NOT NULL,PRIMARY KEY(tenant_id,table_number));
INSERT OR IGNORE INTO service_tables(tenant_id,table_number,label) VALUES('condado-demo',1,'Mesa 01'),('condado-demo',2,'Mesa 02'),('condado-demo',3,'Mesa 03'),('condado-demo',4,'Mesa 04');
CREATE TABLE IF NOT EXISTS service_tabs(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,table_number INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'OPEN',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,requested_at TEXT,closed_at TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tabs_open ON service_tabs(tenant_id,table_number) WHERE status IN ('OPEN','CHECKOUT_REQUESTED');
CREATE TABLE IF NOT EXISTS catalog_items(tenant_id TEXT NOT NULL,id TEXT NOT NULL,name TEXT NOT NULL,category TEXT NOT NULL,description TEXT NOT NULL,price_cents INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1,image_url TEXT NOT NULL DEFAULT '',PRIMARY KEY(tenant_id,id));
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(tenant_id,tab_id);
CREATE INDEX IF NOT EXISTS idx_reservations_day ON reservations(tenant_id,visit_date,visit_time);
