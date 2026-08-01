'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Typography,
  Space,
  Empty,
  App,
  Modal,
  Form,
  Input,
  InputNumber,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  MinusCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  getRoutines,
  upsertRoutine,
  deleteRoutine,
  uid,
  seedExampleRoutines,
} from '@/lib/db';

const { Title, Text } = Typography;

export default function RotinasPage() {
  const { message, modal } = App.useApp();
  const [ready, setReady] = useState(false);
  const [routines, setRoutines] = useState([]);
  const [editing, setEditing] = useState(null); // rotina em edição ou null
  const [form] = Form.useForm();

  function load() {
    setRoutines(getRoutines());
    setReady(true);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing({ id: null });
    form.setFieldsValue({
      name: '',
      finisher: '',
      exercises: [{ id: uid(), name: '', targetSets: 4, targetReps: '8', meta: '', obs: '' }],
    });
  }

  function openEdit(r) {
    setEditing(r);
    form.setFieldsValue({
      name: r.name,
      finisher: r.finisher || '',
      exercises: r.exercises.map((e) => ({ ...e })),
    });
  }

  function save() {
    form.validateFields().then((v) => {
      const routine = {
        id: editing?.id || uid(),
        name: v.name.trim(),
        finisher: (v.finisher || '').trim(),
        exercises: (v.exercises || [])
          .filter((e) => e.name && e.name.trim())
          .map((e) => ({
            id: e.id || uid(),
            name: e.name.trim(),
            targetSets: Number(e.targetSets) || 1,
            targetReps: String(e.targetReps ?? '').trim(),
            meta: (e.meta || '').trim(),
            obs: (e.obs || '').trim(),
          })),
      };
      if (routine.exercises.length === 0) {
        message.warning('Adicione pelo menos um exercício.');
        return;
      }
      upsertRoutine(routine);
      setEditing(null);
      load();
      message.success('Rotina salva!');
    });
  }

  function duplicate(r) {
    upsertRoutine({
      ...r,
      id: uid(),
      name: `${r.name} (cópia)`,
      exercises: r.exercises.map((e) => ({ ...e, id: uid() })),
    });
    load();
    message.success('Rotina duplicada.');
  }

  function remove(r) {
    modal.confirm({
      title: `Excluir "${r.name}"?`,
      content: 'O histórico de treinos já feitos é mantido.',
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: () => {
        deleteRoutine(r.id);
        load();
      },
    });
  }

  function loadExamples() {
    seedExampleRoutines();
    load();
    message.success('Treinos A, B e C carregados!');
  }

  if (!ready) return null;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} className="page-title grad-title" style={{ margin: 0 }}>
          Rotinas
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
          Nova
        </Button>
      </div>

      {routines.length === 0 ? (
        <Card style={{ marginTop: 12 }}>
          <Empty description="Nenhuma rotina ainda">
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
                Criar do zero
              </Button>
              <Button
                icon={
                  <span className="anim-spark">
                    <ThunderboltOutlined />
                  </span>
                }
                onClick={loadExamples}
              >
                Carregar meus Treinos A / B / C
              </Button>
            </Space>
          </Empty>
        </Card>
      ) : (
        <Space orientation="vertical" size={12} style={{ width: '100%', marginTop: 8 }}>
          {routines.map((r, i) => (
            <Card
              key={r.id}
              className="fade-in-up"
              style={{ animationDelay: `${i * 70}ms` }}
              styles={{ body: { padding: 14 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 16 }}>
                    {r.name}
                  </Text>
                  <div style={{ marginTop: 6 }}>
                    {r.exercises.map((e) => (
                      <div key={e.id} style={{ fontSize: 13, color: '#b8b8c0' }}>
                        • {e.name}{' '}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {e.targetSets}x{e.targetReps}
                          {e.meta ? ` · ${e.meta}` : ''}
                        </Text>
                      </div>
                    ))}
                    {r.finisher && (
                      <div style={{ fontSize: 12, color: '#8a8a94', marginTop: 4 }}>
                        🏁 {r.finisher}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
                  Editar
                </Button>
                <Button size="small" icon={<CopyOutlined />} onClick={() => duplicate(r)}>
                  Duplicar
                </Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(r)} />
              </Space>
            </Card>
          ))}
        </Space>
      )}

      <Modal
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={save}
        okText="Salvar"
        cancelText="Cancelar"
        title={editing?.id ? 'Editar rotina' : 'Nova rotina'}
        width="100%"
        style={{ maxWidth: 560, top: 24 }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="name"
            label="Nome do treino"
            rules={[{ required: true, message: 'Dê um nome (ex: Treino A — Costas e Bíceps)' }]}
          >
            <Input placeholder="Treino A — Costas e Bíceps" />
          </Form.Item>

          <Text strong>Exercícios</Text>
          <Form.List name="exercises">
            {(fields, { add, remove }) => (
              <div style={{ marginTop: 8 }}>
                {fields.map((field) => (
                  <Card key={field.key} size="small" style={{ marginBottom: 10 }} styles={{ body: { padding: 12 } }}>
                    <Form.Item name={[field.name, 'id']} hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'name']}
                      style={{ marginBottom: 8 }}
                      rules={[{ required: true, message: 'Nome do exercício' }]}
                    >
                      <Input placeholder="Nome do exercício" />
                    </Form.Item>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <Form.Item
                        name={[field.name, 'targetSets']}
                        label="Séries"
                        style={{ marginBottom: 0, flex: '0 0 92px' }}
                      >
                        <InputNumber min={1} max={20} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'targetReps']}
                        label="Reps"
                        style={{ marginBottom: 0, flex: 1 }}
                      >
                        <Input placeholder="8 ou 8 a 10" />
                      </Form.Item>
                    </div>
                    <Form.Item name={[field.name, 'meta']} style={{ marginBottom: 8 }}>
                      <Input placeholder="Meta / carga de referência (ex: Halter 8-9kg)" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'obs']} style={{ marginBottom: 8 }}>
                      <Input placeholder="Observação (ex: descida lenta)" />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(field.name)}
                    >
                      Remover
                    </Button>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => add({ id: uid(), name: '', targetSets: 4, targetReps: '8', meta: '', obs: '' })}
                >
                  Adicionar exercício
                </Button>
              </div>
            )}
          </Form.List>

          <Form.Item name="finisher" label="Pós-treino / observações" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} placeholder="Ex: 8 a 10 min de escada; abdominal 4x15..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
