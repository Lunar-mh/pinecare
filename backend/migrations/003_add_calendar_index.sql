-- 003-medication-reminder: 月历查询索引

ALTER TABLE medication_logs
  ADD INDEX idx_medication_logs_calendar (user_id, scheduled_time, status);
