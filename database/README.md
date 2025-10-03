# Database Setup Guide

This guide will help you set up the Supabase database for Tradalyse.

## Prerequisites

- Supabase account ([supabase.com](https://supabase.com))
- Basic understanding of SQL

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `tradalyse` (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select the region closest to your users
5. Click "Create new project"
6. Wait for the project to be created (usually 2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

3. Add these to your `.env` file:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key-here
   ```

## Step 3: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `database/schema.sql` and paste it into the editor
4. Click "Run" to execute the schema

This will create:
- ✅ `trades` table with all necessary columns
- ✅ Indexes for optimal performance
- ✅ Row Level Security policies
- ✅ Storage bucket for documents
- ✅ Analytics views and functions

## Step 4: Verify Setup

### Check Tables
Run this query to verify the trades table was created:
```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trades' 
ORDER BY ordinal_position;
```

### Check Policies
Run this query to verify security policies:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'trades';
```

### Check Storage Bucket
Run this query to verify storage bucket:
```sql
SELECT * FROM storage.buckets WHERE id = 'trade-documents';
```

## Step 5: Test Authentication (Optional)

1. Go to **Authentication** → **Users** in your Supabase dashboard
2. Click "Add user" to create a test user
3. Or use the sign-up form in your app to create a user
4. Verify the user can be created successfully

## Step 6: Add Sample Data (Optional)

To test the application with sample data:

1. Get your user ID from **Authentication** → **Users**
2. Uncomment the sample data section in `database/schema.sql`
3. Replace `'your-user-id-here'` with your actual user ID
4. Run the INSERT statements

## Storage Configuration

The schema includes a storage bucket for trade documents. To use it:

1. **Upload files**: Use the Supabase storage API
2. **File organization**: Files are organized by user ID
3. **Security**: Users can only access their own files

Example file path structure:
```
trade-documents/
├── user-id-1/
│   ├── trade-confirmation-1.pdf
│   └── screenshot-1.png
└── user-id-2/
    └── trade-confirmation-2.pdf
```

## Analytics Views

The schema includes pre-built views for analytics:

### `closed_trades_analytics`
Provides summary statistics for closed trades:
- Total trades count
- Win/loss counts
- Average win/loss amounts
- Win rate percentage
- Total and average P&L

### `daily_pnl`
Provides daily P&L breakdown:
- Daily profit/loss amounts
- Number of trades per day
- Sorted by date (most recent first)

## Custom Functions

### `calculate_trade_expectancy(user_uuid)`
Calculates the mathematical expectancy of trades for a user.

Usage:
```sql
SELECT calculate_trade_expectancy('your-user-id-here');
```

## Troubleshooting

### Common Issues

**Issue**: "relation does not exist" error
**Solution**: Make sure you ran the complete schema.sql file

**Issue**: "permission denied" error
**Solution**: Check that Row Level Security policies are properly set up

**Issue**: Storage bucket not accessible
**Solution**: Verify storage policies are created and user is authenticated

### Performance Optimization

The schema includes several performance optimizations:

1. **Indexes**: On frequently queried columns (user_id, symbol, dates)
2. **Partitioning**: Consider partitioning by date for large datasets
3. **Archiving**: Consider archiving old trades to a separate table

### Monitoring

Monitor your database performance:

1. **Supabase Dashboard**: Check the "Database" tab for query performance
2. **Logs**: Review logs in the "Logs" section
3. **Metrics**: Monitor usage in the "Usage" section

## Security Best Practices

1. **Never expose service role key** in client-side code
2. **Use Row Level Security** for all user data
3. **Validate inputs** in your application code
4. **Regular backups** of your database
5. **Monitor access logs** for suspicious activity

## Backup and Recovery

### Automated Backups
Supabase provides automated daily backups. Check your project settings for backup configuration.

### Manual Backup
To create a manual backup:
1. Go to **Settings** → **Database**
2. Click "Download backup" (if available in your plan)

### Restore from Backup
Contact Supabase support for restore procedures.

## Scaling Considerations

As your application grows:

1. **Database size**: Monitor storage usage
2. **Query performance**: Use the query performance insights
3. **Connection limits**: Consider connection pooling
4. **Geographic distribution**: Consider read replicas

## Support

If you encounter issues:

1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Visit the [Supabase Community](https://github.com/supabase/supabase/discussions)
3. Create an issue in this repository

---

**Next Steps**: After completing the database setup, proceed to the main [README.md](../README.md) for application setup instructions.
