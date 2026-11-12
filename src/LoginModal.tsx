import { useState } from 'react';
import { Button, Form, Input, Modal, Typography } from 'antd';
import { User, hashPassword, uid } from './storage';

interface Props {
  open: boolean;
  users: User[];
  onCancel: () => void;
  onLogin: (u: User, isNew: boolean) => void;
}

// Mock-вход: без сервера. Нового пользователя создаём при первом входе.
export default function LoginModal({ open, users, onCancel, onLogin }: Props) {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);

  const submit = async ({ name, password }: { name: string; password: string }) => {
    setError(null);
    const hash = await hashPassword(password);
    const existing = users.find((u) => u.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      if (existing.passwordHash !== hash) return setError('Неверный пароль');
      onLogin(existing, false);
    } else {
      onLogin({ id: uid(), name: name.trim(), passwordHash: hash, createdAt: Date.now() }, true);
    }
    form.resetFields();
  };

  return (
    <Modal open={open} title="Вход" width={360} footer={null} onCancel={onCancel} destroyOnHidden>
      <Typography.Text type="secondary">Можно и без входа. Если имени ещё нет, создам аккаунт.</Typography.Text>
      <Form form={form} layout="vertical" onFinish={submit} style={{ marginTop: 16 }} requiredMark={false}>
        <Form.Item name="name" label="Имя" rules={[{ required: true, whitespace: true, message: 'Введи имя' }]}>
          <Input autoFocus />
        </Form.Item>
        <Form.Item
          name="password"
          label="Пароль"
          rules={[{ required: true, message: 'Введи пароль' }]}
          validateStatus={error ? 'error' : undefined}
          help={error ?? undefined}
        >
          <Input.Password />
        </Form.Item>
        <Button type="primary" htmlType="submit" block shape="round">Войти</Button>
      </Form>
    </Modal>
  );
}
