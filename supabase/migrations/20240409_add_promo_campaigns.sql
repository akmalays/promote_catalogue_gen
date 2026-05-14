-- Create Promo Campaigns Table
CREATE TABLE IF NOT EXISTS promo_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT false,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Campaign Products Table
CREATE TABLE IF NOT EXISTS campaign_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES promo_campaigns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    promo_type TEXT NOT NULL CHECK (promo_type IN ('price_cut', 'b1g1', 'b2g1', 'buy_x_get_y')),
    promo_price NUMERIC, -- Use this for 'price_cut'
    buy_qty INTEGER DEFAULT 1,
    get_qty INTEGER DEFAULT 1,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, product_id)
);

-- Enable RLS
ALTER TABLE promo_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_products ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Enable all for users based on company_id" ON promo_campaigns
    FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE company_id = promo_campaigns.company_id));

CREATE POLICY "Enable all for users based on company_id" ON campaign_products
    FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE company_id = campaign_products.company_id));
