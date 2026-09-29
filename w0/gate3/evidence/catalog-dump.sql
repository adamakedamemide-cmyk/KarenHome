-- ordered catalog dump for schema diffing
SELECT 'TABLE.' || table_schema || '.' || table_name FROM information_schema.tables WHERE table_schema IN ('platform','iam','org','geo','property','marketplace','project','crm','messaging','billing','verification','moderation','content','audit','legal','rental','valuation','notification','review','commission','advertising') AND table_type='BASE TABLE'
UNION ALL SELECT 'VIEW.' || table_schema || '.' || table_name FROM information_schema.tables WHERE table_schema IN ('platform','iam','org','geo','property','marketplace','project','commission','advertising') AND table_type='VIEW'
UNION ALL SELECT 'COL.' || table_schema || '.' || table_name || '.' || column_name || ':' || data_type || COALESCE(':' || character_maximum_length::text,'') FROM information_schema.columns WHERE table_schema IN ('iam','org','geo','property','marketplace','project','audit','legal','rental','billing','commission','advertising','platform')
UNION ALL SELECT 'ENUM.' || t.typname || '.' || e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
UNION ALL SELECT 'FN.' || p.proname || '.' || pg_get_function_identity_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('platform','iam','org','property','marketplace','commission','advertising')
UNION ALL SELECT 'TRG.' || tgname || '@' || n.nspname || '.' || c.relname FROM pg_trigger tg JOIN pg_class c ON c.oid=tg.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT tg.tgisinternal
UNION ALL SELECT 'IDX.' || indexname || '@' || schemaname || '.' || tablename FROM pg_indexes WHERE schemaname IN ('iam','org','marketplace','commission','advertising','audit','property','project')
ORDER BY 1;
