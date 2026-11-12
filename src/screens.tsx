import { useEffect, useState } from 'react';
import { Button, Card, Checkbox, Empty, Flex, Input, List, Result, Slider, Space, Statistic, Switch, Timeline, Typography } from 'antd';
import { CheckOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import type { Answer, Goal, NudgeEvent, Session, Settings } from './storage';
import NotifyStatus from './NotifyStatus';
import { formatDuration, minutesText, plural, timesText } from './nudges';

dayjs.locale('ru');
const { Title, Text } = Typography;

const distractions = (s: Session) => s.events.filter((e) => e.answer === 'distracted').length;

/* ---------- Новая цель (старт сессии или следующее дело) ---------- */

export function NewGoalScreen(props: {
  first: boolean;
  doneGoals: Goal[];
  settings: Settings;
  onSettings: (s: Settings) => void;
  onStart: (text: string) => void;
  onFinish?: () => void;
}) {
  const { first, doneGoals, settings, onSettings, onStart, onFinish } = props;
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    onStart(text);
    setText('');
  };
  const range = settings.demo ? 'через 5–15 секунд' : `через ${settings.minIntervalMin}–${settings.maxIntervalMin} мин`;

  return (
    <Flex vertical gap={24}>
      <Title level={2} style={{ margin: 0 }}>{first ? 'Зачем ты сел за компьютер?' : 'Что дальше?'}</Title>
      {doneGoals.length > 0 && (
        <List size="small" dataSource={doneGoals} renderItem={(g) => (
          <List.Item><Text className="goal-done"><CheckOutlined /> {g.text}</Text></List.Item>
        )} />
      )}
      <Input.TextArea
        size="large"
        autoSize={{ minRows: 2, maxRows: 4 }}
        placeholder="Например: разгрести почту"
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); submit(); } }}
      />
      {first && <NotifyStatus />}
      {first && (
        <Card size="small">
          <Flex vertical gap={8}>
            <Text>Спрошу в случайный момент {range}</Text>
            <Slider
              range
              min={1}
              max={60}
              disabled={settings.demo}
              value={[settings.minIntervalMin, settings.maxIntervalMin]}
              onChange={([a, b]) => onSettings({ ...settings, minIntervalMin: a, maxIntervalMin: b })}
            />
            <Space>
              <Switch size="small" checked={settings.demo} onChange={(demo) => onSettings({ ...settings, demo })} />
              <Text type="secondary">Демо-режим: спрашивать через 5–15 секунд</Text>
            </Space>
          </Flex>
        </Card>
      )}
      <Button type="primary" size="large" shape="round" block disabled={!text.trim()} onClick={submit}>
        {first ? 'Начать' : 'Продолжить'}
      </Button>
      {onFinish && <Button type="link" onClick={onFinish}>Нет, на сегодня всё</Button>}
    </Flex>
  );
}

/* ---------- Идёт сессия ---------- */

export function SessionScreen(props: {
  session: Session;
  goal: Goal;
  pending?: NudgeEvent;
  now: number;
  onAnswer: (a: Answer) => void;
  onAddGoal: (text: string) => void;
  onFinish: () => void;
}) {
  const { session, goal, pending, now, onAnswer, onAddGoal, onFinish } = props;
  const [adding, setAdding] = useState('');

  return (
    <Flex vertical gap={32} align="stretch">
      <Flex vertical gap={8} align="center">
        <Text type="secondary">Сейчас ты делаешь</Text>
        <Title level={1} className="goal-title">{goal.text}</Title>
        <Text type="secondary" className="timer">В работе {formatDuration(now - session.startedAt)}</Text>
      </Flex>

      {pending ? (
        <NudgeCard nudge={pending} onAnswer={onAnswer} />
      ) : (
        <Text type="secondary" style={{ textAlign: 'center' }}>
          Сверни вкладку и работай. Я сам спрошу, как дела.
        </Text>
      )}

      <Card size="small" title="Цели сессии">
        <List
          size="small"
          dataSource={session.goals}
          renderItem={(g) => (
            <List.Item>
              <Checkbox
                checked={!!g.doneAt}
                disabled={!!g.doneAt || g.id !== goal.id}
                onChange={() => onAnswer('done')}
              >
                <span className={g.doneAt ? 'goal-done' : undefined} style={{ fontWeight: g.id === goal.id ? 600 : 400 }}>{g.text}</span>
              </Checkbox>
            </List.Item>
          )}
        />
        <Space.Compact style={{ width: '100%', marginTop: 8 }}>
          <Input placeholder="Добавить цель в очередь" value={adding} onChange={(e) => setAdding(e.target.value)}
            onPressEnter={() => { if (adding.trim()) { onAddGoal(adding); setAdding(''); } }} />
          <Button icon={<PlusOutlined />} disabled={!adding.trim()} onClick={() => { onAddGoal(adding); setAdding(''); }} />
        </Space.Compact>
      </Card>

      <NotifyStatus />
      <Button type="link" onClick={onFinish}>Завершить сессию</Button>
    </Flex>
  );
}

/* ---------- Карточка тыкалки ---------- */

function NudgeCard({ nudge, onAnswer }: { nudge: NudgeEvent; onAnswer: (a: Answer) => void }) {
  // Ответы с клавиш 1 / 2 / 3
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '1') onAnswer('doing');
      if (e.key === '2') onAnswer('distracted');
      if (e.key === '3') onAnswer('done');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAnswer]);

  return (
    <Card className="nudge-card" style={{ borderLeft: '4px solid var(--ant-color-warning, #E8A33D)', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }}>
      <Flex vertical gap={16}>
        <Text style={{ fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>{nudge.message}</Text>
        <Space wrap>
          <Button type="primary" onClick={() => onAnswer('doing')}>{nudge.kind === 'done' ? 'Ещё делаю' : 'Делаю'}</Button>
          <Button color="orange" variant="filled" onClick={() => onAnswer('distracted')}>Отвлёкся</Button>
          <Button color="green" variant="solid" onClick={() => onAnswer('done')}>Сделал!</Button>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>Можно ответить клавишами 1, 2, 3</Text>
      </Flex>
    </Card>
  );
}

/* ---------- Итог ---------- */

export function SummaryScreen({ session, onClose }: { session: Session; onClose: () => void }) {
  const ms = (session.endedAt ?? Date.now()) - session.startedAt;
  const done = session.goals.filter((g) => g.doneAt).length;
  const d = distractions(session);
  return (
    <Result
      status="success"
      title={`${minutesText(ms)}, ${done} ${plural(done, 'цель', 'цели', 'целей')}, отвлёкся ${timesText(d)}.`}
      extra={[<Button key="ok" type="primary" shape="round" size="large" onClick={onClose}>Завершить</Button>]}
    >
      <Flex justify="space-around">
        <Statistic title="Минут" value={Math.max(1, Math.round(ms / 60_000))} />
        <Statistic title="Целей" value={done} />
        <Statistic title="Отвлечений" value={d} />
      </Flex>
    </Result>
  );
}

/* ---------- История ---------- */

export function HistoryScreen({ sessions, onBack }: { sessions: Session[]; onBack: () => void }) {
  const list = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  return (
    <Flex vertical gap={24}>
      <Title level={2} style={{ margin: 0 }}>История</Title>
      {list.length === 0 ? (
        <Empty description="Тут будут твои сессии" />
      ) : (
        <Timeline
          items={list.map((s) => ({
            children: (
              <Flex vertical>
                <Text strong>{dayjs(s.startedAt).format('D MMMM, HH:mm')}</Text>
                <Text>{s.goals.map((g) => g.text).join(', ')}</Text>
                <Text type="secondary">
                  {minutesText((s.endedAt ?? s.startedAt) - s.startedAt)}, отвлёкся {timesText(distractions(s))}
                </Text>
              </Flex>
            ),
          }))}
        />
      )}
      <Button onClick={onBack}>Назад</Button>
    </Flex>
  );
}
