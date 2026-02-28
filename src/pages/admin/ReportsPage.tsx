import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileText, Download } from 'lucide-react';
import { generateReport } from '../../api/report';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { toast } from '../../components/ui/Toast';

export function ReportsPage() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: generateReport,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vsoko-report.pdf';
      a.click();
      toast('Отчёт сгенерирован!', 'success');
    },
    onError: () => toast('Ошибка генерации отчёта', 'error'),
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Отчёты</h1>
        <p className="page-subtitle">Генерация и скачивание отчётов</p>
      </div>

      <Card style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            <FileText size={32} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.25rem', color: 'var(--color-primary)' }}>Отчёт ВСОКО</h3>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              Сформировать полный отчёт по всем оценкам
            </p>
          </div>
          <Button onClick={() => mutate()} loading={isPending} icon={<Download size={18} />} size="lg">
            Сгенерировать отчёт
          </Button>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download="vsoko-report.pdf"
              style={{ color: 'var(--color-accent)', fontSize: '0.88rem' }}
            >
              Скачать повторно
            </a>
          )}
        </div>
      </Card>
    </div>
  );
}
