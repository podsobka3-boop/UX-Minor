import { useEffect, useState } from 'react';
import { Alert, Button, Flex, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { askPermission, showTestNotification } from './notify';

type Perm = NotificationPermission | 'unsupported';
const current = (): Perm => ('Notification' in window ? Notification.permission : 'unsupported');

// Показывает, включены ли системные уведомления, и даёт их проверить.
export default function NotifyStatus() {
  const [perm, setPerm] = useState<Perm>(current);

  // Разрешение могут поменять в настройках браузера — перепроверяем при возврате во вкладку.
  useEffect(() => {
    const fn = () => setPerm(current());
    window.addEventListener('focus', fn);
    return () => window.removeEventListener('focus', fn);
  }, []);

  if (perm === 'unsupported') {
    return <Alert type="warning" showIcon message="Этот браузер не умеет системные уведомления. Вопросы будут только во вкладке." />;
  }

  if (perm === 'default') {
    return (
      <Alert
        type="info"
        showIcon
        icon={<BellOutlined />}
        message="Включи уведомления, чтобы вопросы приходили, даже когда ты в другой вкладке или программе."
        action={<Button size="small" type="primary" onClick={async () => setPerm(await askPermission())}>Включить</Button>}
      />
    );
  }

  if (perm === 'denied') {
    return (
      <Alert
        type="warning"
        showIcon
        message="Уведомления запрещены"
        description="Нажми на значок слева от адреса сайта → «Разрешения для этого сайта» → Уведомления: «Разрешить». Потом обнови страницу."
      />
    );
  }

  return (
    <Flex align="center" justify="space-between" gap={8} wrap>
      <Typography.Text type="secondary"><BellOutlined /> Уведомления включены</Typography.Text>
      <Button size="small" onClick={showTestNotification}>Проверить</Button>
    </Flex>
  );
}
