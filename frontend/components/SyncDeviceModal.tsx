'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { linkDevice } from '@/lib/device-service';

interface SyncDeviceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SyncDeviceModal({ onClose, onSuccess }: SyncDeviceModalProps) {
  const [macAddress, setMacAddress] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    if (!macAddress.trim() || !deviceName.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress)) {
      toast.error('MAC address inválida. Formato: AA:BB:CC:DD:EE:FF');
      return;
    }

    setLoading(true);
    try {
      await linkDevice(macAddress.toUpperCase(), deviceName);
      toast.success('✅ Dispositivo sincronizado correctamente');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error en la sincronización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sincronizar Dispositivo ESP32</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">MAC Address del ESP32</label>
            <Input
              placeholder="AA:BB:CC:DD:EE:FF"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Puedes encontrarlo en la salida serial del ESP32</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nombre del Dispositivo</label>
            <Input
              placeholder="Ej: ESP32-Sala"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button onClick={onClose} variant="outline" disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSync} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}