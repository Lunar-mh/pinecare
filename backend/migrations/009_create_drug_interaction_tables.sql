-- 009-drug-interaction: 创建用药交互检查相关表

CREATE TABLE IF NOT EXISTS drug_interactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  drug_a VARCHAR(64) NOT NULL,
  drug_b VARCHAR(64) NOT NULL,
  level ENUM('X', 'D', 'C', 'B', 'A') NOT NULL,
  mechanism TEXT NULL,
  risk_description TEXT NULL,
  suggestion TEXT NULL,
  status ENUM('pending', 'acknowledged') NOT NULL DEFAULT 'pending',
  check_batch_id VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_009_drug_interactions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_009_drug_interactions_user_status (user_id, status, created_at),
  INDEX idx_009_drug_interactions_batch (check_batch_id),
  INDEX idx_009_drug_interactions_pair (drug_a, drug_b)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS drug_contraindications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  drug_name VARCHAR(64) NOT NULL,
  disease_code VARCHAR(64) NOT NULL,
  disease_name VARCHAR(128) NOT NULL,
  severity ENUM('high', 'medium', 'low') NOT NULL,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_009_drug_contraindications_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_009_drug_contra_user_drug (user_id, drug_name, created_at),
  INDEX idx_009_drug_contra_disease (disease_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS drug_food_interactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  drug_name VARCHAR(64) NOT NULL,
  food_name VARCHAR(64) NOT NULL,
  interaction_type VARCHAR(64) NOT NULL,
  description TEXT NULL,
  suggestion TEXT NULL,
  UNIQUE KEY uk_009_drug_food_pair (drug_name, food_name),
  INDEX idx_009_drug_food_drug (drug_name),
  INDEX idx_009_drug_food_type (interaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 009-drug-interaction: 初始化 20 条常见药物-食物相互作用静态数据
INSERT IGNORE INTO drug_food_interactions
  (drug_name, food_name, interaction_type, description, suggestion)
VALUES
  ('华法林', '菠菜', '拮抗作用', '菠菜富含维生素K，可能降低华法林抗凝效果。', '保持每日维生素K摄入稳定，避免突然大量食用。'),
  ('华法林', '西兰花', '拮抗作用', '西兰花富含维生素K，可能使抗凝效果波动。', '可少量规律食用，不要忽高忽低。'),
  ('阿司匹林', '酒精', '出血风险增加', '酒精与阿司匹林同用会增加胃肠道出血风险。', '服药期间避免饮酒，如有黑便及时就医。'),
  ('布洛芬', '酒精', '胃黏膜损伤', '共同使用可增加胃痛、胃出血等风险。', '尽量不饮酒，必要时饭后服药并观察不适。'),
  ('对乙酰氨基酚', '酒精', '肝毒性增加', '长期或大量饮酒会增加肝损伤风险。', '服药期间禁止饮酒，避免超剂量使用。'),
  ('辛伐他汀', '葡萄柚', '代谢抑制', '葡萄柚抑制CYP3A4，可能导致血药浓度升高。', '服药期间避免葡萄柚及其果汁。'),
  ('阿托伐他汀', '葡萄柚', '代谢抑制', '可能增加肌痛和肌酶升高风险。', '尽量不食用葡萄柚，出现肌痛及时就医。'),
  ('非洛地平', '葡萄柚', '降压过强', '葡萄柚可增强药效，引发头晕、低血压。', '服药期间不建议饮用葡萄柚汁。'),
  ('硝苯地平', '葡萄柚', '降压过强', '可使血药浓度升高，增加低血压风险。', '监测血压并避免葡萄柚摄入。'),
  ('地高辛', '高纤维食物', '吸收降低', '高纤维食物可能降低地高辛吸收率。', '药物与高纤维餐建议间隔2小时以上。'),
  ('左甲状腺素', '牛奶', '吸收降低', '钙离子会影响左甲状腺素吸收。', '建议空腹服药，服药后30-60分钟再进食。'),
  ('左甲状腺素', '豆浆', '吸收降低', '大豆成分可干扰药物吸收。', '与豆浆至少间隔4小时。'),
  ('阿仑膦酸钠', '咖啡', '吸收降低', '咖啡会显著降低阿仑膦酸钠吸收。', '清晨空腹用白水送服，30分钟内勿进食饮品。'),
  ('甲硝唑', '酒精', '双硫仑样反应', '可能出现面红、心悸、呕吐等反应。', '服药期间及停药后48小时内禁酒。'),
  ('头孢哌酮', '酒精', '双硫仑样反应', '与酒精同用可诱发严重不适。', '治疗期间及停药后72小时内禁酒。'),
  ('氯吡格雷', '葡萄柚', '代谢影响', '可能影响抗血小板活化过程，疗效不稳定。', '避免葡萄柚并按医嘱复查。'),
  ('环孢素', '葡萄柚', '代谢抑制', '可导致血药浓度升高并增加肾毒性风险。', '严格避免葡萄柚并按时监测血药浓度。'),
  ('卡托普利', '香蕉', '高钾风险', '与高钾食物同用可能引发高钾血症。', '控制高钾食物摄入，定期复查电解质。'),
  ('螺内酯', '香蕉', '高钾风险', '保钾利尿剂与高钾食物同用风险升高。', '减少高钾食物，出现乏力心悸及时就医。'),
  ('单硝酸异山梨酯', '酒精', '低血压风险', '酒精可加强扩血管作用导致头晕跌倒。', '服药期间避免饮酒，起身动作放慢。');
