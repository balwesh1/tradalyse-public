#!/bin/bash

# Tradalyse Public Release Script
echo "🚀 Preparing Tradalyse for public release..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Initializing..."
    git init
fi

# Add all files
echo "📁 Adding files to git..."
git add .

# Check if there are any changes
if git diff --cached --quiet; then
    echo "ℹ️  No changes to commit."
    exit 0
fi

# Commit with a descriptive message
echo "💾 Committing changes..."
git commit -m "feat: Initial public release v1.0.0

✨ Features:
- Complete trading analytics dashboard
- Real-time P&L tracking and performance metrics
- Interactive charts for data visualization
- Responsive design for mobile, tablet, and desktop
- Supabase integration for data persistence
- User authentication and data security
- Trade import functionality from Interactive Brokers
- Advanced analytics with win rates and expectancy

📚 Documentation:
- Comprehensive README with setup instructions
- Database schema and setup guide
- Installation guide for all platforms
- Contributing guidelines and code of conduct
- MIT license for open source distribution

🗄️ Database:
- Complete SQL schema with tables, indexes, and security policies
- Analytics views and functions
- Storage bucket configuration
- Sample data for testing

🔧 Configuration:
- Environment variable templates
- Clean app configuration for public release
- Updated package.json with proper metadata
- Comprehensive .gitignore for security

Ready for public use! 🎉"

# Set up remote if not already set
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "🔗 Setting up remote repository..."
    git remote add origin git@github.com:heavyguidence/Tradalyse-Public.git
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git branch -M main
git push -u origin main

echo "✅ Successfully pushed to GitHub!"
echo "🌐 Repository: https://github.com/heavyguidence/Tradalyse-Public"
echo ""
echo "📋 Next steps:"
echo "1. Verify all files are uploaded correctly"
echo "2. Test the installation process on a fresh machine"
echo "3. Update repository description and topics on GitHub"
echo "4. Consider adding screenshots to the README"
echo "5. Set up GitHub Actions for CI/CD (optional)"
echo ""
echo "🎉 Tradalyse is now public and ready for the community!"
