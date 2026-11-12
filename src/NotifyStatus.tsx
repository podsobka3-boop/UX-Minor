import { useEffect, useState } from 'react';
import { Alert, Button, Flex, Popover, Typography } from 'antd';
import { BellOutlined, DownloadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { askPermission, showTestNotification } from './notify';
import { canInstall, install, isInstalled, onInstallChange } from './install';

type Perm = NotificationPermission | 'unsupported';
const current = (): Perm => ('Notification' in window ? Notification.permission : 'unsupported');

const appName = () => (isInstalled() ? '«Делаешь?»' : 'Microsoft Edge (или Chrome)');

// Почему баннер может не всплыть, хотя уведомление пришло.
function BannerHelp() {
  return (
    <div style={{ maxWidth: 340 }}>
      <Typography.Paragraph style={{ marginBottom: 8 }}>
        Если уведомление есть в Центре уведомлений, но баннер не всплывает, его прячет «Фокусировка внимания» Windows
        (по умолчанию она включена ночью с 23:00 до 7:00).
      </Typography.Paragraph>
      <Typography.Paragraph style={{ marginBottom: 8 }}>
        Не выключай её целиком, а добавь приложение в исключения:
      </Typography.Paragraph>
      <ol style={{ paddingLeft: 20, margin: 0 }}>
        <li>Параметры → Система → Фокусировка внимания → «Только приоритет».</li>
        <li>«Настроить список приоритетов» → «Добавить приложение» → {appName()}.</li>
      </ol>
      {!isInstalled() && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Совет: установи «Делаешь?» как приложение, тогда в исключения можно добавить только его, а не весь браузер.
        </Typography.Paragraph>
      )}
    </div>
  );
}

// Показывает, включены ли системные уведомления, и даёт их проверить.
export default function NotifyStatus() {
  const [perm, setPerm] = useState<Perm>(current);
  const [installable, setInstallable] = useState(canInstall);

  // Разрешение могут поменять в настройках браузера — перепроверяем при возврате во вкладку.
  useEffect(() => {
    const fn = () => setPerm(current());
    window.addEventListener('focus', fn);
    const off = onInstallChange(() => setInstallable(canInstall()));
    return () => {
      window.removeEventListener('focus', fn);
      off();
    };
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
      <Flex gap={8} wrap>
        <Popover content={<BannerHelp />} title="Не видишь баннер?" trigger="click">
          <Button size="small" type="text" icon={<QuestionCircleOutlined />}>Не видишь баннер?</Button>
        </Popover>
        {installable && !isInstalled() && (
          <Button size="small" icon={<DownloadOutlined />} onClick={install}>Установить</Button>
        )}
        <Button size="small" onClick={showTestNotification}>Проверить</Button>
      </Flex>
    </Flex>
  );
}
