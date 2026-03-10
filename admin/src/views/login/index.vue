<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, User } from '@element-plus/icons-vue'
import { adminLogin } from '@/services'

const router = useRouter()
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const error = ref('')

async function handleLogin() {
  if (!form.username || !form.password) {
    error.value = '请输入账号和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await adminLogin({ username: form.username, password: form.password })
    localStorage.setItem('admin_token', result.token)
    router.push('/dashboard')
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '登录失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo__badge">银</div>
        <h1 class="login-logo__title">银伴管理后台</h1>
        <p class="login-logo__sub">全域智慧照护平台</p>
      </div>

      <el-form @submit.prevent="handleLogin" class="login-form">
        <el-form-item>
          <el-input
            v-model="form.username"
            placeholder="管理员账号"
            :prefix-icon="User"
            size="large"
            autocomplete="username"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="登录密码"
            :prefix-icon="Lock"
            size="large"
            show-password
            autocomplete="current-password"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <p v-if="error" class="login-error">{{ error }}</p>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          style="width: 100%; margin-top: 8px"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </el-button>
        <p class="login-hint">管理账号：admin / admin123</p>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #001529 0%, #01579b 100%);
}

.login-card {
  width: 400px;
  background: #fff;
  border-radius: 16px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-logo {
  text-align: center;
  margin-bottom: 36px;
}

.login-logo__badge {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: #01579b;
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.login-logo__title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 6px;
}

.login-logo__sub {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.login-error {
  font-size: 13px;
  color: #e53935;
  margin: 0;
  text-align: center;
}

.login-hint {
  font-size: 12px;
  color: #bbb;
  text-align: center;
  margin: 12px 0 0;
}
</style>
