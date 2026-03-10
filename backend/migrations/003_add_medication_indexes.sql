-- 003-medication-reminder: 补充索引、外键与约束

ALTER TABLE medication_plans
  ADD INDEX idx_medication_plans_user_active (user_id, is_active),
  ADD INDEX idx_medication_plans_date_range (start_date, end_date),
  ADD CONSTRAINT fk_medication_plans_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE medication_logs
  ADD INDEX idx_medication_logs_user_time (user_id, scheduled_time),
  ADD INDEX idx_medication_logs_plan_time (plan_id, scheduled_time),
  ADD INDEX idx_medication_logs_status_time (status, scheduled_time),
  ADD CONSTRAINT fk_medication_logs_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_medication_logs_plan_id
    FOREIGN KEY (plan_id) REFERENCES medication_plans(id) ON DELETE CASCADE;

ALTER TABLE medication_settings
  ADD CONSTRAINT fk_medication_settings_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE reminder_queue
  ADD INDEX idx_reminder_queue_status_time (status, scheduled_at),
  ADD INDEX idx_reminder_queue_user_type_time (user_id, remind_type, scheduled_at),
  ADD CONSTRAINT fk_reminder_queue_plan_id
    FOREIGN KEY (plan_id) REFERENCES medication_plans(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_reminder_queue_log_id
    FOREIGN KEY (log_id) REFERENCES medication_logs(id) ON DELETE SET NULL;
