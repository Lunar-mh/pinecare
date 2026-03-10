-- 003-medication-reminder: 设置唯一约束与队列补充索引

ALTER TABLE medication_settings
  ADD UNIQUE KEY uk_medication_settings_user_id (user_id),
  ADD INDEX idx_medication_settings_enabled (reminder_enabled, family_sync_enabled);

ALTER TABLE reminder_queue
  ADD INDEX idx_reminder_queue_log_type (log_id, remind_type),
  ADD INDEX idx_reminder_queue_plan_status (plan_id, status);
