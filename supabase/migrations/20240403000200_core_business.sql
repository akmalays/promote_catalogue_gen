-- Table: products (Master Stok & Produk)
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT DEFAULT 'All',
    plu TEXT UNIQUE,
    price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: catalogues (Draft & Katalog Promo)
CREATE TABLE IF NOT EXISTS catalogues (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    catalog_data JSONB NOT NULL,
    creator_name TEXT,
    thumbnail TEXT, -- Base64 thumbnail for preview
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: visitors (Daftar Pelanggan/Customer)
CREATE TABLE IF NOT EXISTS visitors (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    nickname TEXT,
    phone TEXT,
    address TEXT,
    selected BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_plu ON products(plu);
CREATE INDEX IF NOT EXISTS idx_catalogues_creator ON catalogues(creator_name);
CREATE INDEX IF NOT EXISTS idx_visitors_name ON visitors(name);

-- Enable RLS (Allow read/write as per current API setup)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all access to catalogues" ON catalogues FOR ALL USING (true);
CREATE POLICY "Allow all access to visitors" ON visitors FOR ALL USING (true);
