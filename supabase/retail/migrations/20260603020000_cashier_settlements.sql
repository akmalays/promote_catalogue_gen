-- Table: cashier_settlements (Sesi Kerja Kasir & Tutup Shift)
CREATE TABLE IF NOT EXISTS cashier_settlements (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    cashier_id UUID, -- NULL-able if auth user is deleted or anonymous
    cashier_name TEXT NOT NULL,
    starting_cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
    expected_cash DECIMAL(15, 2) NOT NULL DEFAULT 0, -- starting_cash + cash_sales
    actual_cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
    difference DECIMAL(15, 2) NOT NULL DEFAULT 0, -- actual_cash - expected_cash
    total_sales DECIMAL(15, 2) NOT NULL DEFAULT 0, -- total omzet (tunai + digital)
    cash_sales DECIMAL(15, 2) NOT NULL DEFAULT 0,
    qris_sales DECIMAL(15, 2) NOT NULL DEFAULT 0,
    debit_sales DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_settlements_company ON cashier_settlements(company_id);
CREATE INDEX IF NOT EXISTS idx_settlements_cashier ON cashier_settlements(cashier_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON cashier_settlements(status);

-- Enable RLS
ALTER TABLE cashier_settlements ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policy
CREATE POLICY "Tenant isolation for settlements" ON cashier_settlements FOR ALL USING (company_id IS NOT NULL);
