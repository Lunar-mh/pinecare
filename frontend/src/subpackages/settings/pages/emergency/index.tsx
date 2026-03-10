import { View, Text, Button, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, post, put, del } from '@/services/request'
import './index.scss'

interface Contact {
  id: string
  name: string
  phone: string
  relation: string
}

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', relation: '' })

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const res = await get('/user/emergency-contacts') as { data?: Contact[] }
      if (res && res.data) {
        setContacts(res.data)
      } else {
        setContacts([])
      }
    } catch (e: unknown) {
      console.error('Failed to fetch contacts', e)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  const handleAdd = () => {
    if (contacts.length >= 5) {
      Taro.showToast({ title: '最多添加5个联系人', icon: 'none' })
      return
    }
    setEditingId(null)
    setFormData({ name: '', phone: '', relation: '' })
    setShowModal(true)
  }

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setFormData({ name: contact.name, phone: contact.phone, relation: contact.relation })
    setShowModal(true)
  }

  const handleDelete = (id: string, name: string) => {
    Taro.showModal({
      title: '删除联系人',
      content: `确定要删除联系人"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({ title: '删除中...' })
          try {
            await del(`/user/emergency-contacts/${id}`)
            Taro.hideLoading()
            Taro.showToast({ title: '删除成功', icon: 'success' })
            fetchContacts()
          } catch (e: unknown) {
            Taro.hideLoading()
            Taro.showToast({ title: '删除失败', icon: 'error' })
          }
        }
      }
    })
  }

  const handleSave = async () => {
    if (!formData.name || !formData.phone || !formData.relation) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    Taro.showLoading({ title: '保存中...' })
    try {
      if (editingId) {
        await put(`/user/emergency-contacts/${editingId}`, formData)
      } else {
        await post('/user/emergency-contacts', formData)
      }
      Taro.hideLoading()
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setShowModal(false)
      fetchContacts()
    } catch (e: unknown) {
      Taro.hideLoading()
      Taro.showToast({ title: '保存失败', icon: 'error' })
    }
  }

  return (
    <View className="emergency-page">
      <ScrollView scrollY className="contact-list">
        {loading ? (
          <View className="empty-state">
            <Text className="empty-text">加载中...</Text>
          </View>
        ) : contacts.length > 0 ? (
          contacts.map(contact => (
            <View key={contact.id} className="contact-card">
              <View className="contact-info">
                <View className="contact-header">
                  <Text className="contact-name">{contact.name}</Text>
                  <Text className="contact-relation">{contact.relation}</Text>
                </View>
                <Text className="contact-phone">{contact.phone}</Text>
              </View>
              <View className="contact-actions">
                <Button className="action-btn edit-btn" onClick={() => handleEdit(contact)}>编辑</Button>
                <Button className="action-btn delete-btn" onClick={() => handleDelete(contact.id, contact.name)}>删除</Button>
              </View>
            </View>
          ))
        ) : (
          <View className="empty-state">
            <Text className="empty-text">暂无紧急联系人</Text>
          </View>
        )}
      </ScrollView>

      <View className="bottom-action">
        <Button className="add-btn" onClick={handleAdd}>
          添加联系人 ({contacts.length}/5)
        </Button>
      </View>

      {showModal && (
        <View className="modal-overlay">
          <View className="modal-content">
            <View className="modal-header">
              <Text className="modal-title">{editingId ? '编辑联系人' : '添加联系人'}</Text>
            </View>
            <View className="modal-body">
              <View className="form-item">
                <Text className="form-label">姓名</Text>
                <Input 
                  className="form-input" 
                  placeholder="请输入姓名" 
                  value={formData.name}
                  onInput={(e) => setFormData({ ...formData, name: e.detail.value })}
                />
              </View>
              <View className="form-item">
                <Text className="form-label">电话</Text>
                <Input 
                  className="form-input" 
                  type="number"
                  placeholder="请输入电话" 
                  value={formData.phone}
                  onInput={(e) => setFormData({ ...formData, phone: e.detail.value })}
                />
              </View>
              <View className="form-item">
                <Text className="form-label">关系</Text>
                <Input 
                  className="form-input" 
                  placeholder="如：儿子、女儿" 
                  value={formData.relation}
                  onInput={(e) => setFormData({ ...formData, relation: e.detail.value })}
                />
              </View>
            </View>
            <View className="modal-footer">
              <Button className="modal-btn cancel-btn" onClick={() => setShowModal(false)}>取消</Button>
              <Button className="modal-btn confirm-btn" onClick={handleSave}>保存</Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
