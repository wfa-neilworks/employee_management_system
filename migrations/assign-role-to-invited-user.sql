-- For HR user
INSERT INTO accounts (email, account_type, created_at)
VALUES ('user@example.com', 'HR', NOW());

-- For PROCUREMENT user
INSERT INTO accounts (email, account_type, created_at)
VALUES ('user@example.com', 'PROCUREMENT', NOW());

-- For ACCOUNTS user
INSERT INTO accounts (email, account_type, created_at)
VALUES ('user@example.com', 'ACCOUNTS', NOW());
