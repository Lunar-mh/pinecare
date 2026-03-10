-- 002-health-archive: 添加健康档案查询与设备管理索引

ALTER TABLE health_records
  ADD INDEX idx_health_records_user_measured (user_id, measured_at),
  ADD INDEX idx_health_records_user_metric_measured (user_id, metric_type, measured_at),
  ADD INDEX idx_health_records_source_synced (source, synced_at),
  ADD INDEX idx_health_records_device_measured (device_id, measured_at);

ALTER TABLE device_bindings
  ADD INDEX idx_device_bindings_user_primary (user_id, is_primary),
  ADD INDEX idx_device_bindings_last_sync (last_sync_at);
