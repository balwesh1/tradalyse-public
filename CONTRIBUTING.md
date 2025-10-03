# Contributing to Tradalyse

Thank you for your interest in contributing to Tradalyse! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Git
- Supabase account (for testing)

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/Tradalyse-Public.git
   cd Tradalyse-Public
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Set up database**
   - Follow the [Database Setup Guide](database/README.md)
   - Run the schema from `database/schema.sql`

5. **Start development server**
   ```bash
   npm start
   ```

## 📋 How to Contribute

### Reporting Bugs

1. Check existing [issues](https://github.com/heavyguidence/Tradalyse-Public/issues) first
2. Use the bug report template
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Device/platform information

### Suggesting Features

1. Check existing [issues](https://github.com/heavyguidence/Tradalyse-Public/issues) and [discussions](https://github.com/heavyguidence/Tradalyse-Public/discussions)
2. Use the feature request template
3. Describe the feature and its benefits
4. Consider implementation complexity

### Code Contributions

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards below
   - Add tests if applicable
   - Update documentation

3. **Test your changes**
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🎨 Coding Standards

### Code Style

- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the project's ESLint configuration
- **Prettier**: Use Prettier for code formatting
- **Naming**: Use descriptive variable and function names

### React Native Best Practices

- Use functional components with hooks
- Implement proper error boundaries
- Follow React Native performance guidelines
- Use TypeScript interfaces for props

### File Organization

```
app/
├── (tabs)/           # Tab navigation screens
├── components/       # Reusable components
├── constants/        # App constants and themes
├── hooks/           # Custom React hooks
├── services/        # API and external services
└── types/           # TypeScript type definitions
```

### Commit Message Format

Use conventional commits:

```
type(scope): description

feat(analytics): add new chart component
fix(auth): resolve login issue on Android
docs(readme): update installation instructions
style(ui): improve button styling
refactor(api): simplify data fetching logic
test(charts): add unit tests for chart components
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for utility functions
- Test React components with React Native Testing Library
- Mock external dependencies (Supabase, etc.)
- Aim for good test coverage

### Test Structure

```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test implementation
  });
  
  it('should handle user interaction', () => {
    // Test implementation
  });
});
```

## 📱 Platform Testing

### Testing Checklist

- [ ] iOS (simulator and device)
- [ ] Android (emulator and device)
- [ ] Web (Chrome, Firefox, Safari)
- [ ] Different screen sizes
- [ ] Dark/light mode
- [ ] Accessibility features

### Device Testing

Test on:
- **iOS**: iPhone 12+, iPad
- **Android**: Various screen sizes
- **Web**: Desktop and mobile browsers

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for complex functions
- Document component props with TypeScript interfaces
- Include usage examples in component files

### README Updates

When adding features:
- Update the main README.md
- Add screenshots if applicable
- Update the features list
- Document any new environment variables

## 🔒 Security

### Security Guidelines

- Never commit API keys or secrets
- Use environment variables for sensitive data
- Follow Supabase security best practices
- Validate all user inputs
- Use proper authentication checks

### Reporting Security Issues

For security vulnerabilities:
1. **DO NOT** create a public issue
2. Email: tradalyse.app@gmail.com
3. Include detailed description and steps to reproduce
4. We'll respond within 48 hours

## 🎯 Areas for Contribution

### High Priority

- [ ] Additional chart types
- [ ] Portfolio optimization features
- [ ] Mobile app store preparation
- [ ] Performance optimizations
- [ ] Accessibility improvements

### Medium Priority

- [ ] Social trading features
- [ ] Advanced analytics
- [ ] Export/import functionality
- [ ] Theme customization
- [ ] Offline support

### Low Priority

- [ ] Additional language support
- [ ] Advanced charting indicators
- [ ] API for third-party integrations
- [ ] Advanced reporting features

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the project's mission

### Getting Help

- Check existing issues and discussions
- Ask questions in GitHub Discussions
- Join our community (if available)
- Email: tradalyse.app@gmail.com

## 📈 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Release notes prepared

## 📞 Contact

- **Email**: tradalyse.app@gmail.com
- **GitHub Issues**: [Create an issue](https://github.com/heavyguidence/Tradalyse-Public/issues)
- **Discussions**: [GitHub Discussions](https://github.com/heavyguidence/Tradalyse-Public/discussions)

---

Thank you for contributing to Tradalyse! 🎉
