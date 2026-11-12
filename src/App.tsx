import { useCallback, useEffect, useRef, useState } from 'react';
import { App as AntApp, Button, Dropdown, Flex, Layout, Modal, Typography } from 'antd';
import { HistoryOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import {
  GUEST, Answer, Session, Settings, User, loadCurrentUserId, loadSessions, loadSettings, loadUsers,
  saveCurrentUserId, saveSessions, saveSettings, saveUsers, uid,
} from './storage';
import { minutesText, nextDelayMs, pickNudge } from './nudges';
import { askPermission, closeSystemNudges, showSystemNudge } from './notify';
import LoginModal from './LoginModal';
import { HistoryScreen, NewGoalScreen, SessionScreen, SummaryScreen } from './screens';

const activeGoalOf = (s?: Session) => s?.goals.find((g) => !g.doneAt);
const pendingNudgeOf = (s?: Session) => {
  const last = s?.events[s.events.length - 1];
  return last && !last.answer ? last : undefined;
};

export default function App() {
  const { message, notification } = AntApp.useApp();
  const [userId, setUserId] = useState(loadCurrentUserId);
  const [users, setUsers] = useState<User[]>(loadUsers);
  const [settings, setSettings] = useState<Settings>(() => loadSettings(userId));
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions(userId));
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState<'main' | 'history'>('main');
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [askAllDone, setAskAllDone] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // Сохраняем всё в localStorage при каждом изменении.
  useEffect(() => saveSessions(userId, sessions), [userId, sessions]);
  useEffect(() => saveSettings(userId, settings), [userId, settings]);
  useEffect(() => saveCurrentUserId(userId), [userId]);
  useEffect(() => saveUsers(users), [users]);

  const active = sessions.find((s) => s.status === 'active');
  const activeGoal = activeGoalOf(active);
  const pending = pendingNudgeOf(active);
  const user = users.find((u) => u.id === userId);

  const updateActive = useCallback((fn: (s: Session) => Session) => {
    setSessions((prev) => prev.map((s) => (s.status === 'active' ? fn(s) : s)));
  }, []);

  // Часы: раз в секунду. В фоновой вкладке браузер может тикать реже,
  // поэтому время вопроса сравниваем с сохранённой отметкой, а не считаем тики.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Пора тыкать?
  const firedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!active || !activeGoal || !active.nextNudgeAt) return;
    if (now < active.nextNudgeAt || firedFor.current === active.nextNudgeAt) return;
    firedFor.current = active.nextNudgeAt;
    const { message: text, kind } = pickNudge(activeGoal.text);
    const ev = { at: Date.now(), goalId: activeGoal.id, message: text, kind };
    updateActive((s) => ({ ...s, events: [...s.events, ev], nextNudgeAt: Date.now() + nextDelayMs(settings) }));
    showSystemNudge(ev, `В работе ${minutesText(Date.now() - active.startedAt)}`);
    if (document.visibilityState === 'visible') {
      notification.open({ key: 'nudge', message: text, description: 'Ответь в карточке', placement: 'bottomRight', duration: 4 });
    }
  }, [now, active, activeGoal, settings, updateActive, notification]);

  // Мигающий заголовок вкладки, пока вопрос без ответа.
  useEffect(() => {
    if (!pending || !activeGoal) {
      document.title = 'Делаешь?';
      return;
    }
    let flip = false;
    const t = setInterval(() => {
      flip = !flip;
      document.title = flip ? `● Делаешь «${activeGoal.text}»?` : 'Делаешь?';
    }, 1500);
    return () => {
      clearInterval(t);
      document.title = 'Делаешь?';
    };
  }, [pending, activeGoal]);

  // Ответ на тыкалку: из карточки, с клавиатуры или из системного уведомления.
  const answer = useCallback(
    (a: Answer) => {
      const s = sessions.find((x) => x.status === 'active');
      const goal = activeGoalOf(s);
      if (!s || !goal) return;
      const t = Date.now();
      updateActive((x) => {
        const events = [...x.events];
        const last = events[events.length - 1];
        if (last && !last.answer) events[events.length - 1] = { ...last, answer: a };
        const goals = a === 'done' ? x.goals.map((g) => (g.id === goal.id ? { ...g, doneAt: t } : g)) : x.goals;
        return { ...x, events, goals };
      });
      closeSystemNudges();
      notification.destroy('nudge');
      if (a === 'distracted') message.info(`Бывает. Назад к «${goal.text}».`);
      if (a === 'done') setAskAllDone(true);
    },
    [sessions, updateActive, message, notification],
  );

  // Ответы из системного уведомления приходят от Service Worker.
  const answerRef = useRef(answer);
  answerRef.current = answer;
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== 'nudge-answer') return;
      setView('main');
      if (e.data.answer) answerRef.current(e.data.answer as Answer);
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, []);

  // Начать сессию или добавить следующую цель.
  const addGoal = async (text: string) => {
    const goal = { id: uid(), text: text.trim(), createdAt: Date.now() };
    if (!active) {
      await askPermission();
      const t = Date.now();
      const session: Session = {
        id: uid(), userId, startedAt: t, nextNudgeAt: t + nextDelayMs(settings),
        status: 'active', goals: [goal], events: [],
      };
      setSessions((prev) => [...prev, session]);
    } else {
      updateActive((s) => ({
        ...s,
        goals: [...s.goals, goal],
        // если активной цели не было, тыкалки были на паузе — запускаем заново
        nextNudgeAt: activeGoalOf(s) ? s.nextNudgeAt : Date.now() + nextDelayMs(settings),
      }));
    }
  };

  const finishSession = () => {
    if (!active) return;
    updateActive((s) => ({ ...s, status: 'finished', endedAt: Date.now(), nextNudgeAt: null }));
    setSummaryId(active.id);
    setAskAllDone(false);
  };

  // Вход и выход.
  const switchUser = (id: string) => {
    setUserId(id);
    setSessions(loadSessions(id));
    setSettings(loadSettings(id));
    setSummaryId(null);
    setView('main');
  };

  const onLogin = (u: User, isNew: boolean) => {
    if (isNew) {
      // первый вход: гостевые сессии переезжают в аккаунт
      const moved = loadSessions(GUEST).map((s) => ({ ...s, userId: u.id }));
      saveSessions(u.id, moved);
      saveSettings(u.id, loadSettings(GUEST));
      saveSessions(GUEST, []);
      setUsers((prev) => [...prev, u]);
    }
    switchUser(u.id);
    setLoginOpen(false);
    message.success(`Привет, ${u.name}`);
  };

  const summary = summaryId ? sessions.find((s) => s.id === summaryId) : undefined;

  let content;
  if (view === 'history') {
    content = <HistoryScreen sessions={sessions.filter((s) => s.status === 'finished')} onBack={() => setView('main')} />;
  } else if (summary) {
    content = <SummaryScreen session={summary} onClose={() => setSummaryId(null)} />;
  } else if (!active || !activeGoal) {
    content = (
      <NewGoalScreen
        first={!active}
        doneGoals={active?.goals ?? []}
        settings={settings}
        onSettings={setSettings}
        onStart={addGoal}
        onFinish={active ? finishSession : undefined}
      />
    );
  } else {
    content = (
      <SessionScreen
        session={active}
        goal={activeGoal}
        pending={pending}
        now={now}
        onAnswer={answer}
        onAddGoal={addGoal}
        onFinish={finishSession}
      />
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header style={{ background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <Typography.Text strong style={{ fontSize: 18, cursor: 'pointer' }} onClick={() => setView('main')}>
          Делаешь?
        </Typography.Text>
        <Flex gap={8}>
          <Button type="text" icon={<HistoryOutlined />} onClick={() => setView(view === 'history' ? 'main' : 'history')}>
            История
          </Button>
          {user ? (
            <Dropdown menu={{ items: [{ key: 'out', icon: <LogoutOutlined />, label: 'Выйти', onClick: () => switchUser(GUEST) }] }}>
              <Button type="text" icon={<UserOutlined />}>{user.name}</Button>
            </Dropdown>
          ) : (
            <Button type="text" icon={<UserOutlined />} onClick={() => setLoginOpen(true)}>Войти</Button>
          )}
        </Flex>
      </Layout.Header>
      <Layout.Content>
        <Flex vertical align="center" style={{ padding: '32px 16px 48px' }}>
          <div style={{ width: '100%', maxWidth: 560 }}>{content}</div>
        </Flex>
      </Layout.Content>

      <Modal
        open={askAllDone}
        centered
        closable={false}
        maskClosable={false}
        title="Молодец. Это всё на сегодня?"
        footer={[
          <Button key="more" onClick={() => setAskAllDone(false)}>Есть ещё дело</Button>,
          <Button key="yes" type="primary" onClick={finishSession}>Да, всё</Button>,
        ]}
      />

      <LoginModal open={loginOpen} users={users} onCancel={() => setLoginOpen(false)} onLogin={onLogin} />
    </Layout>
  );
}
