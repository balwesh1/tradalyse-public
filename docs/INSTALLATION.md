# Installation Guide

This guide will walk you through setting up Tradalyse on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **Expo CLI** - Install with `npm install -g @expo/cli`
- **Supabase Account** - [Sign up](https://supabase.com)

### Platform-Specific Requirements

#### For iOS Development
- **macOS** (required for iOS development)
- **Xcode** (latest version from App Store)
- **iOS Simulator** (comes with Xcode)

#### For Android Development
- **Android Studio** - [Download](https://developer.android.com/studio)
- **Android SDK** (comes with Android Studio)
- **Android Emulator** or physical Android device

#### For Web Development
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

## Installation Steps

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/heavyguidence/Tradalyse-Public.git

# Navigate to the project directory
cd Tradalyse-Public
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Or if you prefer yarn
yarn install
```

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your Supabase credentials
# You'll get these from your Supabase project settings
```

Edit the `.env` file with your actual values:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# App Configuration
EXPO_PUBLIC_APP_NAME=Tradalyse
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_SUPPORT_EMAIL=tradalyse.app@gmail.com
```

### 4. Set Up Supabase Database

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Sign in and create a new project
   - Wait for the project to be created (2-3 minutes)

2. **Get Your Credentials**
   - Go to **Settings** → **API** in your Supabase dashboard
   - Copy the **Project URL** and **anon public** key
   - Add these to your `.env` file

3. **Set Up Database Schema**
   - Go to **SQL Editor** in your Supabase dashboard
   - Copy the contents of `database/schema.sql`
   - Paste and run the SQL script
   - This creates all necessary tables, indexes, and security policies

For detailed database setup instructions, see [Database Setup Guide](database/README.md).

### 5. Start the Development Server

```bash
# Start the Expo development server
npm start

# Or use specific platform commands
npm run ios     # Start iOS simulator
npm run android # Start Android emulator
npm run web     # Start web development server
```

### 6. Test the Installation

1. **Open the app** in your chosen platform
2. **Create an account** using the sign-up form
3. **Add a test trade** to verify everything works
4. **Check the analytics** to see the charts and metrics

## Platform-Specific Setup

### iOS Setup

1. **Install Xcode** from the App Store
2. **Open Xcode** and accept the license agreement
3. **Install iOS Simulator** (comes with Xcode)
4. **Run the app**:
   ```bash
   npm run ios
   ```

### Android Setup

1. **Install Android Studio**
2. **Set up Android SDK**:
   - Open Android Studio
   - Go to **Tools** → **SDK Manager**
   - Install the latest Android SDK
3. **Create an Android Virtual Device (AVD)**:
   - Go to **Tools** → **AVD Manager**
   - Create a new virtual device
4. **Run the app**:
   ```bash
   npm run android
   ```

### Web Setup

1. **Install a modern web browser**
2. **Run the web version**:
   ```bash
   npm run web
   ```
3. **Open** `http://localhost:8081` in your browser

## Troubleshooting

### Common Issues

#### "Module not found" errors
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules
npm install
```

#### Expo CLI issues
```bash
# Update Expo CLI
npm install -g @expo/cli@latest

# Clear Expo cache
expo r -c
```

#### Metro bundler issues
```bash
# Reset Metro cache
npx expo start --clear
```

#### Database connection issues
- Verify your Supabase URL and key in `.env`
- Check that your Supabase project is active
- Ensure the database schema was created successfully

#### Platform-specific issues

**iOS Simulator not starting:**
- Restart Xcode
- Reset iOS Simulator: **Device** → **Erase All Content and Settings**

**Android Emulator not starting:**
- Check that virtualization is enabled in BIOS
- Increase emulator RAM in AVD settings
- Try creating a new AVD

**Web build issues:**
- Clear browser cache
- Try a different browser
- Check console for JavaScript errors

### Getting Help

If you encounter issues:

1. **Check the logs** in your terminal
2. **Review the documentation** in `/docs`
3. **Search existing issues** on [GitHub](https://github.com/heavyguidence/Tradalyse-Public/issues)
4. **Create a new issue** with:
   - Your operating system
   - Node.js version (`node --version`)
   - Expo CLI version (`expo --version`)
   - Error messages and steps to reproduce

## Development Workflow

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and test them

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

4. **Push and create a PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Testing Your Changes

- **Test on multiple platforms** (iOS, Android, Web)
- **Test different screen sizes**
- **Test with sample data**
- **Verify analytics calculations**

## Production Deployment

### Web Deployment

```bash
# Build for production
npm run build:web

# Deploy the 'dist' folder to your hosting service
# (Vercel, Netlify, etc.)
```

### Mobile App Deployment

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for app stores
npm run build:ios     # iOS App Store
npm run build:android  # Google Play Store
npm run build:all      # Both platforms
```

## Next Steps

After successful installation:

1. **Read the [README.md](README.md)** for app overview
2. **Check [CONTRIBUTING.md](CONTRIBUTING.md)** for development guidelines
3. **Explore the codebase** to understand the structure
4. **Add sample data** to test all features
5. **Customize** the app for your needs

## Support

- **Documentation**: Check this guide and README.md
- **Issues**: [GitHub Issues](https://github.com/heavyguidence/Tradalyse-Public/issues)
- **Email**: tradalyse.app@gmail.com

---

**Happy coding! 🚀**
