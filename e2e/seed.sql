-- e2e/seed.sql — wipes mutable state between tests
truncate table posts cascade;
truncate table viewer_codes cascade;
truncate table viewer_sessions cascade;
truncate table rate_limit_attempts cascade;
