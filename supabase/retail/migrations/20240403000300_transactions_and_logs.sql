-- Table: sales (Data Transaksi POS)
CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash', -- cash | qris | debit
    items JSONB NOT NULL DEFAULT '[]', -- Array of {name, qty, price}
    cash_received DECIMAL(15, 2) DEFAULT 0,
    change_amount DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: blast_history (Riwayat Pengiriman/Promosi)
CREATE TABLE IF NOT EXISTS blast_history (
    id BIGSERIAL PRIMARY KEY,
    promo_name TEXT NOT NULL,
    sender_name TEXT,
    recipient_count INTEGER DEFAULT 0,
    catalogue_preview TEXT, -- Base64 thumbnail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: supply_history (Riwayat Stok Masuk/Inbound)
CREATE TABLE IF NOT EXISTS supply_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT,
    change_qty INTEGER NOT NULL,
    reason TEXT DEFAULT 'Stok Masuk',
    sender_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_blast_history_name ON blast_history(promo_name);
CREATE INDEX IF NOT EXISTS idx_supply_product_id ON supply_history(product_id);

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE blast_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to sales" ON sales FOR ALL USING (true);
CREATE POLICY "Allow all access to blast_history" ON blast_history FOR ALL USING (true);
CREATE POLICY "Allow all access to supply_history" ON supply_history FOR ALL USING (true);
