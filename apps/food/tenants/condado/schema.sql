CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, vertical TEXT NOT NULL DEFAULT 'FOOD', contract_status TEXT NOT NULL DEFAULT 'NOT_SIGNED', publication_status TEXT NOT NULL DEFAULT 'PREVIEW', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO tenants(id,display_name,slug,vertical,contract_status,publication_status) VALUES ('condado-demo','Condado Livraria & Café','condado','FOOD','NOT_SIGNED','PREVIEW');
CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),guest_name TEXT NOT NULL,phone TEXT NOT NULL,party_size INTEGER NOT NULL CHECK(party_size BETWEEN 1 AND 8),visit_date TEXT NOT NULL,visit_time TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'SOLICITADA',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_date ON reservations(tenant_id,visit_date,visit_time);
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),items_json TEXT NOT NULL,total_cents INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'NOVO',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_id,created_at);
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY,ip_hash TEXT NOT NULL,kind TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_events_ip_created ON events(ip_hash,created_at);
