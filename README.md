# Tradalyse - Trading Journal App

A comprehensive trading journal application built with React Native, Expo, and Supabase.

## Features

- **Authentication**: Secure sign up and sign in with Supabase Auth
- **Dashboard**: Overview of trading statistics and performance
- **Trade Tracking**: Record and manage your trades
- **Analytics**: Detailed analytics and insights
- **Profile Management**: User profile and settings

## Tech Stack

- **Frontend**: React Native, Expo
- **Styling**: NativeWind (TailwindCSS for React Native)
- **Backend**: Supabase
- **Authentication**: Supabase Auth
- **Form Handling**: React Hook Form with Zod validation
- **Navigation**: Expo Router

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from the project settings
3. Create a `.env` file in the root directory with:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Run the App

```bash
# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

## Project Structure

```
app/
├── (tabs)/           # Tab navigation screens
│   ├── index.tsx     # Home/Dashboard
│   ├── trades.tsx    # Trade history
│   ├── analytics.tsx # Analytics dashboard
│   └── profile.tsx   # User profile
├── signin.tsx        # Sign in screen
├── signup.tsx        # Sign up screen
└── _layout.tsx       # Root layout with auth

contexts/
└── AuthContext.tsx   # Authentication context

lib/
├── supabase.ts       # Supabase client
└── validations.ts    # Form validation schemas
```

## Authentication Flow

1. **Unauthenticated users** are redirected to the sign-in screen
2. **New users** can sign up and will receive an email verification
3. **Authenticated users** can access the main app with tab navigation
4. **Sign out** functionality is available in the profile tab

## Next Steps

- Set up Supabase database tables for trades
- Implement trade creation and editing
- Add analytics and charting
- Implement profile management
- Add push notifications
- Add data export functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License