'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Card,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Empty,
  Tag,
  App,
} from 'antd';
import {
  PlayCircleFilled,
  PlusOutlined,
  FireFilled,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { getRoutines, getActive, startSession, getSessions } from '@/lib/db';
import BackupModal from '@/components/BackupModal';

const { Title, Text } = Typography;

export default function HomePage() {
  const router = useRouter();
  const { modal } = App.useApp();
  const [ready, setReady] = useState(false);
  const [routines, setRoutines] = useState([]);
  const [active, setActiveState] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [backup, setBackup] = useState(false);

  function load() {
    setRoutines(getRoutines());
    setActiveState(getActive());
    setSessions(getSessions());
    setReady(true);
  }

  useEffect(() => {
    load();
  }, []);

  function treinar(routine) {
    if (active) {
      modal.confirm({
        title: 'Você tem um treino em andamento',
        content: 'Quer descartar ele e começar este novo?',
        okText: 'Começar novo',
        okButtonProps: { danger: true },
        cancelText: 'Voltar',
        onOk: () => {
          startSession(routine);
          router.push('/treino');
        },
      });
      return;
    }
    startSession(routine);
    router.push('/treino');
  }

  if (!ready) return null;

  const now = Date.now();
  const week = sessions.filter((s) => now - new Date(s.date).getTime() < 7 * 864e5).length;
  const last = sessions[0];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} className="page-title" style={{ margin: 0 }}>
          <span className="grad-title">Bora treinar </span>
          <span className="anim-muscle" style={{ WebkitTextFillColor: 'initial' }}>
            💪
          </span>
        </Title>
        <Button type="text" icon={<CloudUploadOutlined />} onClick={() => setBackup(true)}>
          Backup
        </Button>
      </div>

      <Row gutter={12} style={{ margin: '8px 0 20px' }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Nos 7 dias"
              value={week}
              prefix={
                <span className="anim-flame">
                  <FireFilled style={{ color: '#22c55e' }} />
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Total" value={sessions.length} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Último"
              value={last ? new Date(last.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
            />
          </Card>
        </Col>
      </Row>

      {active && (
        <Card
          className="glow-pulse fade-in-up"
          style={{ marginBottom: 20, borderColor: '#22c55e', background: 'rgba(34,197,94,0.08)' }}
          styles={{ body: { padding: 16 } }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            Treino em andamento
          </Text>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <Title level={4} style={{ margin: 0 }}>
              {active.routineName}
            </Title>
            <Button type="primary" icon={<PlayCircleFilled />} onClick={() => router.push('/treino')}>
              Continuar
            </Button>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>
          Escolha o treino de hoje
        </Title>
        <Link href="/rotinas">
          <Button type="link" size="small" style={{ padding: 0 }}>
            Gerenciar
          </Button>
        </Link>
      </div>

      {routines.length === 0 ? (
        <Card>
          <Empty description="Você ainda não criou nenhuma rotina">
            <Link href="/rotinas">
              <Button type="primary" icon={<PlusOutlined />}>
                Criar minha primeira rotina
              </Button>
            </Link>
          </Empty>
        </Card>
      ) : (
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          {routines.map((r, i) => (
            <Card
              key={r.id}
              className="fade-in-up"
              style={{ animationDelay: `${i * 70}ms` }}
              styles={{ body: { padding: 14 } }}
              hoverable
              onClick={() => treinar(r)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    {r.name}
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color="green" style={{ marginInlineEnd: 0 }}>
                      {r.exercises.length} exercício{r.exercises.length === 1 ? '' : 's'}
                    </Tag>
                  </div>
                </div>
                <Button type="primary" icon={<PlayCircleFilled />}>
                  Treinar
                </Button>
              </div>
            </Card>
          ))}
        </Space>
      )}

      <BackupModal open={backup} onClose={() => setBackup(false)} onImported={load} />
    </>
  );
}
