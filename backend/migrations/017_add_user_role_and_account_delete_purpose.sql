ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_role ENUM('elder', 'family') NOT NULL DEFAULT 'elder' AFTER phone;

UPDATE users u
SET u.user_role = CASE
  WHEN EXISTS (
    SELECT 1
    FROM family_bindings fb
    WHERE fb.family_user_id = u.id
      AND fb.binding_status IN ('pending', 'approved')
  ) THEN 'family'
  ELSE 'elder'
END;

ALTER TABLE sms_codes
  MODIFY COLUMN purpose ENUM('register', 'login', 'bind', 'reset_password', 'account_delete') NOT NULL;