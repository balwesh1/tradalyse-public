-- Tradalyse Database Schema
-- Version: 1.0.0
-- Description: Complete database setup for Tradalyse trading analytics dashboard

-- Enable Row Level Security for auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TRADES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol text NOT NULL,
    side text NOT NULL CHECK (side IN ('long', 'short')),
    entry_price decimal(15,4) NOT NULL,
    exit_price decimal(15,4),
    quantity integer NOT NULL CHECK (quantity > 0),
    entry_date timestamptz NOT NULL,
    exit_date timestamptz,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    pnl decimal(15,2),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON trades(entry_date);
CREATE INDEX IF NOT EXISTS idx_trades_exit_date ON trades(exit_date);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own trades
CREATE POLICY "Users can manage own trades" ON trades
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on trades
CREATE TRIGGER update_trades_updated_at 
    BEFORE UPDATE ON trades 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STORAGE BUCKETS (Optional)
-- =============================================

-- Create storage bucket for trade documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-documents', 'trade-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for trade documents
CREATE POLICY "Users can upload own documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'trade-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'trade-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'trade-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'trade-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Uncomment the following to insert sample data
-- Replace 'your-user-id-here' with an actual user ID from auth.users

/*
INSERT INTO trades (user_id, symbol, side, entry_price, exit_price, quantity, entry_date, exit_date, status, pnl, notes) VALUES
('your-user-id-here', 'AAPL', 'long', 150.00, 155.00, 100, '2024-01-15 09:30:00', '2024-01-15 15:30:00', 'closed', 500.00, 'Successful swing trade'),
('your-user-id-here', 'TSLA', 'short', 200.00, 195.00, 50, '2024-01-16 10:00:00', '2024-01-16 16:00:00', 'closed', 250.00, 'Short scalp trade'),
('your-user-id-here', 'NVDA', 'long', 400.00, NULL, 25, '2024-01-17 11:00:00', NULL, 'open', NULL, 'Current position'),
('your-user-id-here', 'MSFT', 'long', 300.00, 295.00, 75, '2024-01-18 09:45:00', '2024-01-18 14:30:00', 'closed', -375.00, 'Stop loss hit'),
('your-user-id-here', 'GOOGL', 'short', 2500.00, 2480.00, 10, '2024-01-19 10:15:00', '2024-01-19 15:45:00', 'closed', 200.00, 'Profit target reached');
*/

-- =============================================
-- VIEWS FOR ANALYTICS (Optional)
-- =============================================

-- View for closed trades analytics
CREATE OR REPLACE VIEW closed_trades_analytics AS
SELECT 
    user_id,
    COUNT(*) as total_trades,
    COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
    COUNT(CASE WHEN pnl <= 0 THEN 1 END) as losing_trades,
    ROUND(AVG(CASE WHEN pnl > 0 THEN pnl END), 2) as avg_win,
    ROUND(AVG(CASE WHEN pnl <= 0 THEN pnl END), 2) as avg_loss,
    ROUND(SUM(pnl), 2) as total_pnl,
    ROUND(AVG(pnl), 2) as avg_pnl_per_trade,
    ROUND(COUNT(CASE WHEN pnl > 0 THEN 1 END)::decimal / COUNT(*) * 100, 2) as win_rate
FROM trades 
WHERE status = 'closed' AND pnl IS NOT NULL
GROUP BY user_id;

-- View for daily P&L
CREATE OR REPLACE VIEW daily_pnl AS
SELECT 
    user_id,
    DATE(exit_date) as trade_date,
    SUM(pnl) as daily_pnl,
    COUNT(*) as trades_count
FROM trades 
WHERE status = 'closed' AND exit_date IS NOT NULL AND pnl IS NOT NULL
GROUP BY user_id, DATE(exit_date)
ORDER BY trade_date DESC;

-- =============================================
-- FUNCTIONS FOR ANALYTICS (Optional)
-- =============================================

-- Function to calculate trade expectancy
CREATE OR REPLACE FUNCTION calculate_trade_expectancy(user_uuid uuid)
RETURNS decimal AS $$
DECLARE
    win_rate decimal;
    avg_win decimal;
    avg_loss decimal;
    expectancy decimal;
BEGIN
    SELECT 
        COUNT(CASE WHEN pnl > 0 THEN 1 END)::decimal / COUNT(*) * 100,
        AVG(CASE WHEN pnl > 0 THEN pnl END),
        AVG(CASE WHEN pnl <= 0 THEN pnl END)
    INTO win_rate, avg_win, avg_loss
    FROM trades 
    WHERE user_id = user_uuid AND status = 'closed' AND pnl IS NOT NULL;
    
    expectancy := (win_rate / 100 * avg_win) + ((100 - win_rate) / 100 * avg_loss);
    RETURN ROUND(expectancy, 2);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- GRANTS AND PERMISSIONS
-- =============================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON trades TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
DO $$
BEGIN
    RAISE NOTICE 'Tradalyse database schema setup completed successfully!';
    RAISE NOTICE 'Tables created: trades';
    RAISE NOTICE 'Storage bucket created: trade-documents';
    RAISE NOTICE 'Analytics views created: closed_trades_analytics, daily_pnl';
    RAISE NOTICE 'Security policies applied for user data isolation';
END $$;
