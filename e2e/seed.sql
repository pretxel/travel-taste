-- e2e/seed.sql — wipes mutable state between tests
truncate table tt_posts cascade;
truncate table tt_viewer_codes cascade;
truncate table tt_viewer_sessions cascade;
truncate table tt_rate_limit_attempts cascade;
