# Changelog

## [1.0.0] - 2024-12-01

### Added
- Initial release of AI-powered SaaS roadmap generator
- Full-stack React application with TypeScript and Vite
- Supabase backend with PostgreSQL database and Edge Functions
- User authentication system with registration component
- Roadmap creation interface with AI integration via `generate-roadmap` Edge Function
- Subscription management with webhook processing via `subscription-webhook` Edge Function
- Database schema with tables for users, roadmaps, and content
- Row Level Security (RLS) policies for data protection
- Tailwind CSS for responsive styling
- Comprehensive test suite for components, pages, and services
- Deployment configurations for Vercel and Netlify
- TypeScript interfaces for User, Roadmap, and Content types
- Application routing structure with main pages (Home, Roadmap)

### Technical
- Project configuration files (Vite, Tailwind, TypeScript, ESLint, PostCSS)
- Environment-based Supabase client setup
- Database migrations for all tables
- Edge Functions for AI generation and subscription handling
- Global CSS with Tailwind imports
- HTML entry point and public assets

## [Unreleased]

### Fixed
- Duplicate test file entries in the initial file list

### Changed
- None

### Deprecated
- None

### Removed
- None

### Security
- None