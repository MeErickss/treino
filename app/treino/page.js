'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Typography,
  Space,
  Progress,
  InputNumber,
  Segmented,
  Input,
  App,
  Tag,
  Result,
  Tooltip,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  FlagFilled,
  HolderOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getActive, setActive, clearActive, saveSession, lastEntryFor } from '@/lib/db';
import { suggestForEntry } from '@/lib/goals';
import styles from './treino.module.scss';

const { Title, Text } = Typography;

const FEELINGS = [
  { label: '😀 Fácil', value: 'facil' },
  { label: '😮‍💨 Ok', value: 'ok' },
  { label: '🥵 No limite', value: 'limite' },
];

// ---- Card de exercício (arrastável) --------------------------------------

function SortableExercise({ id, e, ei, cb }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const last = lastEntryFor(e.name);
  const allDone = e.sets.length > 0 && e.sets.every((s) => s.done);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        styles={{ body: { padding: 14 } }}
        style={{
          ...(isDragging ? { boxShadow: '0 10px 30px rgba(0,0,0,0.5)', borderColor: '#22c55e' } : {}),
          ...(allDone && !isDragging ? { borderColor: '#22c55e', boxShadow: '0 0 16px rgba(34,197,94,0.25)' } : {}),
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 16 }}>
              <span style={{ color: '#22c55e' }}>{ei + 1}.</span> {e.name}
            </Text>
            <div style={{ fontSize: 12, color: '#8a8a94', marginTop: 2 }}>
              Meta: {e.targetSets}x{e.targetReps}
              {e.meta ? ` · ${e.meta}` : ''}
            </div>
            {e.obs && <div style={{ fontSize: 12, color: '#8a8a94' }}>💡 {e.obs}</div>}
            {last?.bestWeight != null && (
              <div style={{ fontSize: 12, color: '#22c55e', marginTop: 2 }}>Última vez: {last.bestWeight}kg</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              className={styles.handle}
              aria-label="Arrastar para reordenar"
            >
              <HolderOutlined />
            </span>
            {allDone && <Tag color="green">feito</Tag>}
          </div>
        </div>

        <div className={styles.setsHead}>
          <Tooltip title={allDone ? 'Desmarcar todas' : 'Marcar todas'}>
            <Button
              type="text"
              size="small"
              className={`${styles.markAll} ${allDone ? styles.markAllOn : ''}`}
              icon={<CheckOutlined />}
              onClick={(ev) => {
                cb.toggleAll(ei);
                ev.currentTarget.blur();
              }}
              aria-label="Marcar todas as séries"
            />
          </Tooltip>
        </div>

        <div className={styles.sets}>
          {e.sets.map((s, si) => (
            <div key={si} className={`${styles.setRow} ${s.done ? styles.setDone : ''}`}>
              <span className={styles.setNum}>{si + 1}ª</span>
              <InputNumber
                value={s.weight}
                min={0}
                step={0.5}
                suffix="kg"
                onChange={(v) => cb.patch(ei, si, { weight: v })}
                inputMode="decimal"
              />
              <InputNumber
                value={s.reps}
                min={0}
                max={99}
                suffix="reps"
                controls={false}
                onChange={(v) => cb.patch(ei, si, { reps: v })}
                inputMode="numeric"
              />
              <Button
                key={s.done ? 'done' : 'todo'}
                className={s.done ? 'pop-in' : undefined}
                type={s.done ? 'primary' : 'default'}
                shape="circle"
                icon={<CheckOutlined />}
                onClick={() => cb.toggle(ei, si)}
              />
              {e.sets.length > 1 && (
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => cb.removeSet(ei, si)}
                />
              )}
            </div>
          ))}
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => cb.addSet(ei)} block>
            Série extra
          </Button>
        </div>

        <div style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Como foi?
          </Text>
          <Segmented
            block
            options={FEELINGS}
            value={e.feeling}
            onChange={(val) => cb.feeling(ei, val)}
            style={{ marginTop: 4 }}
          />
        </div>

        <Input
          style={{ marginTop: 10 }}
          placeholder="Anotação (opcional)"
          value={e.note}
          onChange={(ev) => cb.note(ei, ev.target.value)}
          allowClear
        />
      </Card>
    </div>
  );
}

// ---- Página do treino -----------------------------------------------------

export default function TreinoPage() {
  const router = useRouter();
  const { modal, message } = App.useApp();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  useEffect(() => {
    setSession(getActive());
    setReady(true);
  }, []);

  function commit(next) {
    setSession(next);
    setActive(next);
  }

  const cb = {
    patch(ei, si, patch) {
      const next = structuredClone(session);
      next.entries[ei].sets[si] = { ...next.entries[ei].sets[si], ...patch };
      commit(next);
    },
    toggle(ei, si) {
      const next = structuredClone(session);
      next.entries[ei].sets[si].done = !next.entries[ei].sets[si].done;
      commit(next);
    },
    toggleAll(ei) {
      const next = structuredClone(session);
      const sets = next.entries[ei].sets;
      const makeDone = !sets.every((s) => s.done);
      sets.forEach((s) => {
        s.done = makeDone;
      });
      commit(next);
    },
    feeling(ei, val) {
      const next = structuredClone(session);
      next.entries[ei].feeling = val;
      commit(next);
    },
    note(ei, val) {
      const next = structuredClone(session);
      next.entries[ei].note = val;
      commit(next);
    },
    addSet(ei) {
      const next = structuredClone(session);
      const sets = next.entries[ei].sets;
      const lastSet = sets[sets.length - 1] || {};
      sets.push({ weight: lastSet.weight ?? null, reps: lastSet.reps ?? null, done: false });
      commit(next);
    },
    removeSet(ei, si) {
      const next = structuredClone(session);
      next.entries[ei].sets.splice(si, 1);
      commit(next);
    },
  };

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const next = structuredClone(session);
    const oldIndex = next.entries.findIndex((e) => e.exerciseId === active.id);
    const newIndex = next.entries.findIndex((e) => e.exerciseId === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    next.entries = arrayMove(next.entries, oldIndex, newIndex);
    commit(next);
  }

  function discard() {
    modal.confirm({
      title: 'Descartar este treino?',
      content: 'O que você registrou aqui será perdido.',
      okText: 'Descartar',
      okButtonProps: { danger: true },
      cancelText: 'Voltar',
      onOk: () => {
        clearActive();
        router.push('/');
      },
    });
  }

  function finish() {
    const doneCount = session.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
    if (doneCount === 0) {
      message.warning('Marque pelo menos uma série antes de finalizar.');
      return;
    }
    const finalize = () => {
      const finished = { ...session, finishedAt: new Date().toISOString() };
      saveSession(finished);
      clearActive();
      const suggestions = finished.entries.map((e) => ({ name: e.name, ...suggestForEntry(e) }));
      setSummary({ session: finished, suggestions });
    };
    const pending = session.entries.some((e) => e.sets.some((s) => !s.done));
    if (pending) {
      modal.confirm({
        title: 'Finalizar treino?',
        content: 'Ainda há séries não marcadas. Elas não entram no registro.',
        okText: 'Finalizar',
        cancelText: 'Voltar',
        onOk: finalize,
      });
    } else {
      finalize();
    }
  }

  if (!ready) return null;

  if (summary) {
    return (
      <div className={styles.summary}>
      <Result
        status="success"
        style={{ padding: '16px 8px 0' }}
        icon={<FlagFilled style={{ color: '#22c55e' }} />}
        title="Treino concluído! 🎉"
        subTitle={summary.session.routineName}
        extra={[
          <Button type="primary" key="hist" onClick={() => router.push('/historico')}>
            Ver histórico
          </Button>,
          <Button key="home" onClick={() => router.push('/')}>
            Início
          </Button>,
        ]}
      >
        <div style={{ textAlign: 'left', maxWidth: 460, margin: '0 auto' }}>
          <Text strong>Meta pra próxima vez:</Text>
          <Space orientation="vertical" size={8} style={{ width: '100%', marginTop: 10 }}>
            {summary.suggestions.map((s, i) => (
              <Card
                key={i}
                size="small"
                className="fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
                styles={{ body: { padding: 12 } }}
              >
                <Text strong style={{ fontSize: 14 }}>
                  {s.name}
                </Text>
                <div style={{ fontSize: 13, color: '#b8b8c0', marginTop: 2 }}>{s.text}</div>
              </Card>
            ))}
          </Space>
        </div>
      </Result>
      </div>
    );
  }

  if (!session) {
    return (
      <Result
        status="info"
        title="Nenhum treino em andamento"
        extra={
          <Button type="primary" onClick={() => router.push('/')}>
            Escolher treino
          </Button>
        }
      />
    );
  }

  const totalSets = session.entries.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = session.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const pct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            {session.routineName}
          </Title>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={discard} />
        </div>
        <Progress percent={pct} strokeColor="#22c55e" format={() => `${doneSets}/${totalSets} séries`} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Arraste pelo ⠿ pra reordenar na ordem que você vai fazer.
        </Text>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={session.entries.map((e) => e.exerciseId)} strategy={verticalListSortingStrategy}>
          <div className={styles.list}>
            {session.entries.map((e, ei) => (
              <SortableExercise key={e.exerciseId} id={e.exerciseId} e={e} ei={ei} cb={cb} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {session.finisher && (
        <Card size="small" styles={{ body: { padding: 12 } }} style={{ marginTop: 14 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            🏁 Pós-treino
          </Text>
          <div style={{ fontSize: 14, marginTop: 2 }}>{session.finisher}</div>
        </Card>
      )}

      <div className={styles.footer}>
        <Button size="large" onClick={discard} icon={<CloseOutlined />}>
          Descartar
        </Button>
        <Button size="large" type="primary" onClick={finish} icon={<FlagFilled />} style={{ flex: 1 }}>
          Finalizar treino
        </Button>
      </div>
    </div>
  );
}
