'use client';

import { useState } from 'react';
import { Modal, Button, Input, Space, Typography, App, Upload } from 'antd';
import { DownloadOutlined, CopyOutlined, UploadOutlined } from '@ant-design/icons';
import { exportAll, importAll } from '@/lib/db';

const { Text } = Typography;

export default function BackupModal({ open, onClose, onImported }) {
  const { message, modal } = App.useApp();
  const [text, setText] = useState('');

  function handleDownload() {
    const data = exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treino-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(exportAll());
      message.success('Backup copiado!');
    } catch {
      message.error('Não consegui copiar. Use o download.');
    }
  }

  function doImport(raw) {
    try {
      importAll(raw);
      message.success('Backup importado!');
      setText('');
      onImported?.();
      onClose?.();
    } catch {
      message.error('Arquivo inválido.');
    }
  }

  function handleImportText() {
    if (!text.trim()) return message.warning('Cole o conteúdo do backup primeiro.');
    modal.confirm({
      title: 'Importar backup?',
      content: 'Isso substitui suas rotinas e treinos atuais pelos do backup.',
      okText: 'Importar',
      cancelText: 'Cancelar',
      onOk: () => doImport(text),
    });
  }

  return (
    <Modal open={open} onCancel={onClose} title="Backup dos dados" footer={null} destroyOnHidden>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Text strong>Exportar</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 13 }}>
            Seus dados ficam só neste aparelho. Guarde um backup de vez em quando.
          </Text>
          <Space style={{ marginTop: 10 }} wrap>
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              Baixar arquivo
            </Button>
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              Copiar
            </Button>
          </Space>
        </div>

        <div>
          <Text strong>Importar</Text>
          <br />
          <Space orientation="vertical" style={{ width: '100%', marginTop: 10 }}>
            <Upload
              accept=".json"
              showUploadList={false}
              beforeUpload={(file) => {
                const reader = new FileReader();
                reader.onload = () => doImport(String(reader.result));
                reader.readAsText(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>Escolher arquivo .json</Button>
            </Upload>
            <Input.TextArea
              rows={4}
              placeholder="...ou cole aqui o conteúdo do backup"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button type="primary" ghost onClick={handleImportText}>
              Importar do texto
            </Button>
          </Space>
        </div>
      </Space>
    </Modal>
  );
}
