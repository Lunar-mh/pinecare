<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, User } from '@element-plus/icons-vue'
import { adminLogin } from '@/services'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const form = reactive({
  username: '',
  password: '',
})

async function handleLogin() {
  if (!form.username || !form.password) {
    error.value = '请输入管理员账号和密码'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const result = await adminLogin({ username: form.username, password: form.password })
    localStorage.setItem('admin_token', result.token)
    router.push('/dashboard')
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '登录失败，请检查账号密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-shell">
    <div class="login-shell__backdrop"></div>
    <div class="login-layout">
      <section class="login-story">
        <div class="login-story__badge">银伴</div>
        <h1 class="login-story__title">社区照护工作台</h1>
        <p class="login-story__subtitle">把告警、健康、定位、家庭协同和社区运营收进一个更稳定、更温和的管理界面。</p>

        <div class="login-story__panel">
          <div class="login-story__item">
            <span class="login-story__label">值班优先级</span>
            <strong class="login-story__value">SOS 与定位异常优先</strong>
          </div>
          <div class="login-story__item">
            <span class="login-story__label">协同对象</span>
            <strong class="login-story__value">管理员 / 社区负责人 / 志愿者运营</strong>
          </div>
          <div class="login-story__item">
            <span class="login-story__label">体验方向</span>
            <strong class="login-story__value">温暖安心，但信息可一眼判断</strong>
          </div>
        </div>
      </section>

      <section class="login-card">
        <div class="login-card__header">
          <span class="login-card__eyebrow">欢迎回来</span>
          <h2 class="login-card__title">登录后台工作台</h2>
          <p class="login-card__desc">进入今日态势、风险处置与社区协同工作区。</p>
        </div>

        <el-form @submit.prevent="handleLogin" class="login-form">
          <el-form-item>
            <el-input
              v-model="form.username"
              :prefix-icon="User"
              placeholder="管理员账号"
              size="large"
              autocomplete="username"
            />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="form.password"
              :prefix-icon="Lock"
              type="password"
              placeholder="登录密码"
              size="large"
              show-password
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <p v-if="error" class="login-form__error">{{ error }}</p>
          <el-button type="primary" size="large" :loading="loading" class="login-form__submit" @click="handleLogin">
            {{ loading ? '登录中...' : '进入工作台' }}
          </el-button>
        </el-form>

        <div class="login-card__footer">
          <span class="login-card__hint">演示账号：admin / admin123</span>
          <div class="login-card__tags">
            <span>工作台</span>
            <span>社区运营</span>
            <span>照护协同</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(201, 123, 85, 0.28), transparent 32%),
    radial-gradient(circle at bottom right, rgba(47, 108, 91, 0.22), transparent 38%),
    linear-gradient(160deg, #f7f1e8 0%, #efe5d7 48%, #e5ecdf 100%);
}

.login-shell__backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.46), transparent 35%),
    linear-gradient(225deg, rgba(255, 255, 255, 0.28), transparent 40%);
}

.login-layout {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  align-items: center;
  gap: 36px;
  padding: 48px 64px;
}

.login-story {
  color: var(--wb-text);
  padding-right: 20px;
}

.login-story__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  background: rgba(47, 108, 91, 0.12);
  color: var(--wb-primary);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.login-story__title {
  margin-top: 18px;
  font-size: 52px;
  line-height: 1.08;
  font-weight: 700;
}

.login-story__subtitle {
  max-width: 620px;
  margin-top: 16px;
  font-size: 18px;
  line-height: 1.8;
  color: var(--wb-text-soft);
}

.login-story__panel {
  margin-top: 28px;
  display: grid;
  gap: 14px;
  max-width: 560px;
}

.login-story__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 22px;
  background: rgba(255, 253, 250, 0.8);
  border: 1px solid rgba(227, 216, 200, 0.9);
  box-shadow: var(--wb-shadow);
}

.login-story__label {
  font-size: 14px;
  color: var(--wb-text-soft);
}

.login-story__value {
  font-size: 16px;
  color: var(--wb-text);
}

.login-card {
  max-width: 460px;
  margin-left: auto;
  padding: 34px 34px 28px;
  border-radius: 30px;
  background: rgba(255, 253, 250, 0.94);
  border: 1px solid rgba(227, 216, 200, 0.95);
  box-shadow: 0 28px 60px rgba(47, 57, 68, 0.14);
  backdrop-filter: blur(12px);
}

.login-card__eyebrow {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(201, 123, 85, 0.12);
  color: var(--wb-secondary);
  font-size: 13px;
  font-weight: 700;
}

.login-card__title {
  margin-top: 18px;
  font-size: 30px;
  line-height: 1.2;
  color: var(--wb-text);
}

.login-card__desc {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--wb-text-soft);
}

.login-form {
  margin-top: 28px;
}

.login-form :deep(.el-input__wrapper) {
  min-height: 54px;
  border-radius: 18px;
  box-shadow: inset 0 0 0 1px rgba(227, 216, 200, 0.95);
}

.login-form__error {
  margin: -4px 0 0;
  font-size: 13px;
  color: var(--wb-danger);
}

.login-form__submit {
  width: 100%;
  height: 54px;
  margin-top: 10px;
  border-radius: 18px;
  font-weight: 700;
}

.login-card__footer {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-card__hint {
  font-size: 13px;
  color: var(--wb-text-soft);
}

.login-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.login-card__tags span {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(47, 108, 91, 0.08);
  color: var(--wb-primary);
  font-size: 12px;
  font-weight: 600;
}
</style>