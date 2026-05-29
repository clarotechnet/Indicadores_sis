import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useCity } from '@/contexts/CityContext';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface KmManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const KmManualDialog: React.FC<KmManualDialogProps> = ({ open, onOpenChange, onComplete }) => {
  const { selectedCity } = useCity();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    login_tecnico: '',
    recurso: '',
    data: new Date().toISOString().split('T')[0],
    trecho: '',
    endereco_destino: '',
    distancia_km: '',
    frente: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.login_tecnico || !form.recurso) {
      toast.error('Preencha Login e Recurso');
      return;
    }
    setLoading(true);

    const distancia = parseFloat(form.distancia_km.replace(',', '.')) || 0;

    const { error } = await supabase.from('km_tecnica').insert({
      login_tecnico: form.login_tecnico.toUpperCase(),
      recurso: form.recurso,
      data: form.data,
      trecho: form.trecho,
      endereco_destino: form.endereco_destino,
      distancia_km: distancia,
      frente: form.frente,
      cidade: selectedCity,
    } as any);

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success('Registro adicionado!');
      setForm({ login_tecnico: '', recurso: '', data: new Date().toISOString().split('T')[0], trecho: '', endereco_destino: '', distancia_km: '', frente: '' });
      onComplete();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Adicionar Registro Manual
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Login do Técnico</Label>
              <Input value={form.login_tecnico} onChange={e => setForm(f => ({ ...f, login_tecnico: e.target.value }))} placeholder="T6074699" />
            </div>
            <div>
              <Label>Recurso (Nome)</Label>
              <Input value={form.recurso} onChange={e => setForm(f => ({ ...f, recurso: e.target.value }))} placeholder="Nome do técnico" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div>
              <Label>Distância (km)</Label>
              <Input value={form.distancia_km} onChange={e => setForm(f => ({ ...f, distancia_km: e.target.value }))} placeholder="7,7" />
            </div>
          </div>
          <div>
            <Label>Trecho</Label>
            <Input value={form.trecho} onChange={e => setForm(f => ({ ...f, trecho: e.target.value }))} placeholder="Casa → Base" />
          </div>
          <div>
            <Label>Endereço Destino</Label>
            <Input value={form.endereco_destino} onChange={e => setForm(f => ({ ...f, endereco_destino: e.target.value }))} placeholder="AV NEVALDO ROCHA, 3775 - TIROL" />
          </div>
          <div>
            <Label>Frente</Label>
            <Input value={form.frente} onChange={e => setForm(f => ({ ...f, frente: e.target.value }))} placeholder="ADESÃO/SERVIÇO" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default KmManualDialog;