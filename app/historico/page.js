'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Typography,
  Card,
  Select,
  Empty,
  Space,
  Tag,
  App,
  Collapse,
  Button,
} from 'antd';
import { AimOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getExerciseNames,
  getExerciseHistory,
  getSessions,
  deleteSession,
} from '@/lib/db';
import { suggestForEntry } from '@/lib/goals';
import ProgressChart from '@/components/ProgressChart';

const { Title, Text } = Typography;

const feelingTag = {
  facil: { color: 'green', label: '😀 Fácil' },
  ok: { color: 'gold', label: '😮‍💨 Ok' },
  limite: { color: 'red', label: '🥵 No limite' },
};

function fmt(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function HistoricoPage() {
  const { modal } = App.useApp();
  const [ready, setReady] = useState(false);
  const [names, setNames] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sessions, setSessions] = useState([]);

  function load() {
    const n = getExerciseNames();
    setNames(n);
    setSelected((prev) => prev || n[0] || null);
    setSessions(getSessions());
    setReady(true);
  }

  useEffect(() => {
    load();
  }, []);

  const history = useMemo(
    () => (selected ? getExerciseHistory(selected) : []),
    [selected, sessions]
  );

  const chartPoints = history.map((h) => ({ label: fmt(h.date), value: h.bestWeight }));
  const suggestion = history.length ? suggestForEntry(history[history.length - 1].entry) : null;

  function removeSession(id) {
    modal.confirm({
      title: 'Excluir este treino do histórico?',
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: () => {
        deleteSession(id);
        load();
      },
    });
  }

  if (!ready) return null;

  return (
    <>
      <Title level={3} className="page-title grad-title">
        Histórico
      </Title>

      {names.length === 0 ? (
        <Card>
          <Empty description="Nenhum treino registrado ainda. Bora treinar!" />
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 20 }} styles={{ body: { padding: 16 } }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Progressão de carga
            </Text>
            <Select
              style={{ width: '100%', margin: '8px 0 12px' }}
              value={selected}
              onChange={setSelected}
              options={names.map((n) => ({ value: n, label: n }))}
              showSearch
            />
            <ProgressChart points={chartPoints} unit="kg" />

            {suggestion && (
              <Card size="small" style={{ marginTop: 12, background: 'rgba(34,197,94,0.08)', borderColor: '#22c55e' }}>
                <Space align="start">
                  <AimOutlined style={{ color: '#22c55e', fontSize: 18, marginTop: 2 }} />
                  <div>
                    <Text strong style={{ fontSize: 13 }}>
                      Meta pra próxima
                    </Text>
                    <div style={{ fontSize: 13, color: '#d0d0d8' }}>{suggestion.text}</div>
                  </div>
                </Space>
              </Card>
            )}

            <div style={{ marginTop: 14 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Cada treino desse exercício
              </Text>
              <Space orientation="vertical" size={6} style={{ width: '100%', marginTop: 6 }}>
                {[...history].reverse().map((h, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}
                  >
                    <span style={{ color: '#8a8a94' }}>{fmt(h.date)}</span>
                    <span>
                      {h.bestWeight != null ? `${h.bestWeight}kg` : '—'} · {h.doneCount} séries
                      {h.entry.feeling && feelingTag[h.entry.feeling] ? (
                        <Tag color={feelingTag[h.entry.feeling].color} style={{ marginInlineStart: 8 }}>
                          {feelingTag[h.entry.feeling].label}
                        </Tag>
                      ) : null}
                    </span>
                  </div>
                ))}
              </Space>
            </div>
          </Card>

          <Title level={5}>Treinos recentes</Title>
          <Collapse
            accordion
            items={sessions.map((s) => ({
              key: s.id,
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <Text strong style={{ fontSize: 14 }}>
                      {s.routineName}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, marginInlineStart: 8 }}>
                      {fmt(s.date)}
                    </Text>
                  </span>
                </div>
              ),
              children: (
                <>
                  {s.entries.map((e) => {
                    const done = e.sets.filter((x) => x.done);
                    if (done.length === 0) return null;
                    return (
                      <div key={e.exerciseId} style={{ fontSize: 13, marginBottom: 6 }}>
                        <Text strong>{e.name}</Text>
                        <div style={{ color: '#b8b8c0' }}>
                          {done.map((x, i) => (
                            <span key={i}>
                              {x.weight ?? '—'}kg×{x.reps ?? '—'}
                              {i < done.length - 1 ? ' · ' : ''}
                            </span>
                          ))}
                          {e.feeling && feelingTag[e.feeling] ? (
                            <Tag color={feelingTag[e.feeling].color} style={{ marginInlineStart: 8 }}>
                              {feelingTag[e.feeling].label}
                            </Tag>
                          ) : null}
                        </div>
                        {e.note ? <div style={{ color: '#8a8a94', fontSize: 12 }}>“{e.note}”</div> : null}
                      </div>
                    );
                  })}
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeSession(s.id)}
                    style={{ marginTop: 8 }}
                  >
                    Excluir treino
                  </Button>
                </>
              ),
            }))}
          />
        </>
      )}
    </>
  );
}
