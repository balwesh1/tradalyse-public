# Tradalyse - Trading Analytics Dashboard

A comprehensive trading analytics dashboard built with React Native and Expo, featuring real-time portfolio tracking, performance analytics, and interactive charts.

![Tradalyse Dashboard](https://img.shields.io/badge/React%20Native-Expo-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android%20%7C%20Web-lightgrey)

## 🚀 Features

- **Portfolio Management**: Track your trades with detailed entry/exit data
- **Real-time Analytics**: Live P&L calculations and performance metrics
- **Interactive Charts**: Visualize your trading performance with dynamic charts
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Secure Authentication**: Built-in user authentication with Supabase
- **Data Import**: Import trades from Interactive Brokers (IB) platform
- **Performance Metrics**: Comprehensive win rates, expectancy, and risk analysis

## 📱 Screenshots

<img width="786" height="1278" alt="Home Page" src="https://github.com/user-attachments/assets/8e92e557-ab9f-46ef-a9c3-bfcacf6f6904" />
<img width="788" height="666" alt="Trade History" src="https://github.com/user-attachments/assets/7bd00bf8-df6d-4007-aa2a-a035c4b19aa3" />
<img width="1047" height="1205" alt="Trade Details" src="https://github.com/user-attachments/assets/62f879c3-6d2f-4771-bc88-25465946f62f" />
<img width="1122" height="1283" alt="Profile" src="https://github.com/user-attachments/assets/37ee9c89-d555-408f-8c1f-594c30b00209" />
<img width="1112" height="832" alt="Settings" src="https://github.com/user-attachments/assets/e1ff37ea-1167-4d59-a339-8d3566d9cd3c" />


## 🛠️ Tech Stack

- **Frontend**: React Native + Expo
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Charts**: Custom React Native chart components
- **State Management**: React Context + Hooks
- **Styling**: StyleSheet with responsive design

## ⚡ Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/heavyguidence/Tradalyse-Public.git
   cd Tradalyse-Public
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Set up Supabase database**
   - Follow the [Database Setup Guide](#database-setup)
   - Run the provided SQL schema

5. **Start the development server**
   ```bash
   npm start
   ```

## 🗄️ Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Database Schema

Run the following SQL in your Supabase SQL editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create trades table
CREATE TABLE trades (
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

-- Create indexes for performance
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_entry_date ON trades(entry_date);

-- Enable Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create security policy
CREATE POLICY "Users can manage own trades" ON trades
    FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trades_updated_at 
    BEFORE UPDATE ON trades 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### 3. Storage Buckets (Optional)

If you plan to add file uploads (trade confirmations, etc.):

```sql
-- Create storage bucket for trade documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-documents', 'trade-documents', false);

-- Create storage policy
CREATE POLICY "Users can upload own documents" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'trade-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'trade-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 🔧 Environment Configuration

Create a `.env` file in the root directory:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# App Configuration
EXPO_PUBLIC_APP_NAME=Tradalyse
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_SUPPORT_EMAIL=tradalyse.app@gmail.com

# Development (Optional)
EXPO_PUBLIC_DEBUG_MODE=false
```

## 📱 Platform Support

- **iOS**: Full support with native performance
- **Android**: Full support with native performance  
- **Web**: Responsive web app with desktop optimization

## 🚀 Deployment

### Expo Application Services (EAS)

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS**
   ```bash
   eas build:configure
   ```

3. **Build for production**
   ```bash
   # iOS
   eas build --platform ios
   
   # Android
   eas build --platform android
   
   # Both platforms
   eas build --platform all
   ```

### Web Deployment

```bash
# Build for web
npx expo export --platform web

# Deploy to Vercel/Netlify
# Upload the 'dist' folder to your hosting service
```

## 📊 Sample Data

To test the application with sample data, run this SQL in your Supabase SQL editor:

```sql
-- Insert sample trades (replace user_id with your actual user ID)
INSERT INTO trades (user_id, symbol, side, entry_price, exit_price, quantity, entry_date, exit_date, status, pnl, notes) VALUES
('your-user-id-here', 'AAPL', 'long', 150.00, 155.00, 100, '2024-01-15 09:30:00', '2024-01-15 15:30:00', 'closed', 500.00, 'Successful swing trade'),
('your-user-id-here', 'TSLA', 'short', 200.00, 195.00, 50, '2024-01-16 10:00:00', '2024-01-16 16:00:00', 'closed', 250.00, 'Short scalp trade'),
('your-user-id-here', 'NVDA', 'long', 400.00, NULL, 25, '2024-01-17 11:00:00', NULL, 'open', NULL, 'Current position');
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and the `/docs` folder
- **Issues**: [GitHub Issues](https://github.com/heavyguidence/Tradalyse-Public/issues)
- **Email**: tradalyse.app@gmail.com

## 🗺️ Roadmap

- [ ] Auto Trade Sync with Various Brokers
       - Currently the code for IBKR is not fully functional to auto import
- [ ] - [ ] Advanced charting with more indicators
- [ ] Portfolio optimization suggestions
- [ ] Social trading features
- [ ] Mobile app store releases
- [ ] API for third-party integrations

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Backend powered by [Supabase](https://supabase.com/)
- Charts inspired by modern trading platforms

---

**Made with ❤️ for the trading community**
