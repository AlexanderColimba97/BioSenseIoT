'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { linkDevice } from '@/lib/device-service';
import { Capacitor } from '@capacitor/core';
import { Bluetooth, BluetoothOff } from 'lucide-react';

// BLE sólo se importa cuando estamos en una plataforma nativa para evitar
// que el módulo rompa en el navegador
let BleClient: any = null;
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  import('@capacitor-community/bluetooth-le').then((mod) => {
    BleClient = mod.BleClient;
  });
}

const IS_WEB = typeof window !== 'undefined' && !Capacitor.isNativePlatform();

interface SyncDeviceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

type NativeDevice = { deviceId: string; name?: string };

export default function SyncDeviceModal({ onClose, onSuccess }: SyncDeviceModalProps) {
  const [devices, setDevices] = useState<NativeDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<NativeDevice | null>(null);
  const [macAddress, setMacAddress] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (IS_WEB || !BleClient) return;
    BleClient.initialize().catch((err: any) => {
      console.error('BLE Init error', err);
      toast.error('Bluetooth no está disponible');
    });
  }, []);

  const handleScan = async () => {
    if (IS_WEB || !BleClient) {
      toast.error('Bluetooth no está disponible en el navegador. Usa la app nativa en tu Android.');
      return;
    }
    try {
      setScanning(true);
      setDevices([]);

      await BleClient.requestLEScan(
        { services: [SERVICE_UUID] },
        (result: any) => {
          if (result.device.name?.startsWith('BioSense')) {
            setDevices((prev) => {
              if (prev.find((d) => d.deviceId === result.device.deviceId)) return prev;
              return [...prev, result.device];
            });
          }
        }
      );

      setTimeout(async () => {
        await BleClient.stopLEScan();
        setScanning(false);
      }, 5000);
    } catch (error) {
      toast.error('Error al escanear Bluetooth');
      setScanning(false);
    }
  };

  const handleSelectDevice = async (device: NativeDevice) => {
    setSelectedDevice(device);
    try {
      setLoading(true);
      await BleClient.connect(device.deviceId);
      const dataView = await BleClient.read(device.deviceId, SERVICE_UUID, CHARACTERISTIC_UUID);
      const dec = new TextDecoder();
      const hwMac = dec.decode(dataView);
      setMacAddress(hwMac);
      toast.success('Dispositivo seleccionado');
    } catch (err) {
      toast.error('Error conectando al dispositivo');
    } finally {
      setLoading(false);
    }
  };

  // Web fallback: vincular dispositivo manualmente ingresando la MAC
  const handleWebManualLink = async () => {
    if (!macAddress.trim() || !deviceName.trim()) {
      toast.error('Por favor ingresa la MAC Address y el nombre del dispositivo');
      return;
    }
    setLoading(true);
    try {
      await linkDevice(macAddress.toUpperCase(), deviceName);
      toast.success('✅ Dispositivo vinculado manualmente');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al vincular');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedDevice) {
      toast.error('Por favor escanea y selecciona un ESP32');
      return;
    }
    if (!macAddress.trim() || !deviceName.trim() || !wifiSsid.trim()) {
      toast.error('Por favor completa todos los campos (WiFi y Nombre)');
      return;
    }

    setLoading(true);
    try {
      // 1. Register mapped MAC in Backend and get the device's api_secret
      const device = await linkDevice(macAddress.toUpperCase(), deviceName);

      // 2. Send WiFi credentials + api_secret via BLE
      //    Format: "SSID,PASSWORD,API_SECRET"
      const apiSecret = device.apiSecret || '';
      const payload = `${wifiSsid},${wifiPassword},${apiSecret}`;
      const data = new TextEncoder().encode(payload);
      const dataView = new DataView(data.buffer);
      await BleClient.write(selectedDevice.deviceId, SERVICE_UUID, CHARACTERISTIC_UUID, dataView);

      toast.success('✅ Dispositivo emparejado y wifi configurado');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error en la sincronización');
    } finally {
      setLoading(false);
      if (selectedDevice) {
        try {
          await BleClient.disconnect(selectedDevice.deviceId);
        } catch (e) {}
      }
    }
  };

  // ─── Browser fallback UI ───────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BluetoothOff className="w-5 h-5 text-muted-foreground" />
              Vincular Dispositivo (Modo Web)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              El Bluetooth no está disponible en el navegador. Puedes vincular tu ESP32
              ingresando su dirección MAC manualmente (la ves en el monitor serie del IDE
              de Arduino al arrancar el dispositivo).
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">MAC Address del ESP32</label>
              <Input
                placeholder="AA:BB:CC:DD:EE:FF"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Dispositivo</label>
              <Input
                placeholder="Ej: Sala Comedor"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                disabled={loading}
              />
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
              ⚠️ Las credenciales WiFi sólo pueden enviarse al ESP32 mediante la app nativa
              Android. Una vez vinculado aquí, usa la app para completar la configuración WiFi.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <Button onClick={onClose} variant="outline" disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleWebManualLink} disabled={loading}>
                {loading ? 'Vinculando...' : 'Vincular Dispositivo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Native (Android) UI ───────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="w-5 h-5 text-primary" />
            Sincronización Inteligente Zero-Friction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedDevice ? (
            <div>
              <Button onClick={handleScan} disabled={scanning} className="w-full mb-4">
                {scanning ? 'Buscando ESP32...' : 'Escanear Bluetooth'}
              </Button>

              <div className="space-y-2">
                {devices.map((d) => (
                  <div key={d.deviceId} className="p-3 border rounded flex justify-between items-center">
                    <span>{d.name || d.deviceId}</span>
                    <Button onClick={() => handleSelectDevice(d)} variant="outline" size="sm">
                      Conectar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">MAC Address (Leída por BT)</label>
                <Input value={macAddress} disabled />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nombre del Dispositivo</label>
                <Input
                  placeholder="Ej: Sala Comedor"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tu WiFi Local (SSID)</label>
                <Input
                  placeholder="MiRedWiFi"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Contraseña del WiFi</label>
                <Input
                  type="password"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button onClick={onClose} variant="outline" disabled={loading}>
                  Cancelar
                </Button>
                <Button onClick={handleSync} disabled={loading} className="bg-green-600 hover:bg-green-700">
                  {loading ? 'Sincronizando...' : 'Vincular y Configurar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
