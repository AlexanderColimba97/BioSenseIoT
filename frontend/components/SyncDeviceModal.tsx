'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { linkDevice } from '@/lib/device-service';
import { Capacitor } from '@capacitor/core';
import { Bluetooth, BluetoothOff } from 'lucide-react';

const IS_WEB = typeof window !== 'undefined' && !Capacitor.isNativePlatform();

interface SyncDeviceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const MAC_REGEX = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;

type NativeDevice = { deviceId: string; name?: string };

// BLE Client lazy loader - espera a que esté disponible
let BleClientPromise: Promise<any> | null = null;
const getBleClient = async () => {
  if (!BleClientPromise && typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    BleClientPromise = import('@capacitor-community/bluetooth-le').then((mod) => mod.BleClient);
  }
  return BleClientPromise;
};

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
    if (IS_WEB) return;
    
    const initBle = async () => {
      try {
        const BleClient = await getBleClient();
        if (!BleClient) {
          toast.error('Bluetooth no está disponible');
          return;
        }
        
        // Inicializar con timeout
        const initPromise = BleClient.initialize();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('BLE initialization timeout')), 10000)
        );
        
        await Promise.race([initPromise, timeoutPromise]);
        
        // Verificar y solicitar permisos
        const permission = await Capacitor.Plugins.Permissions?.query?.({ name: 'bluetooth' });
        if (permission?.state === 'denied') {
          toast.warning('⚠️ Permiso de Bluetooth denegado');
        }
      } catch (err) {
        console.error('BLE initialization failed:', err);
        toast.error('No se pudo inicializar Bluetooth');
      }
    };
    
    initBle();
  }, []);

  const handleScan = async () => {
    if (IS_WEB) {
      toast.error('Bluetooth no está disponible en el navegador. Usa la app nativa en tu Android.');
      return;
    }
    
    try {
      const BleClient = await getBleClient();
      if (!BleClient) {
        toast.error('Bluetooth no está disponible');
        return;
      }
      
      setScanning(true);
      setDevices([]);

      await BleClient.requestLEScan(
        { services: [SERVICE_UUID] },
        (result: any) => {
          if (result?.device?.name?.startsWith('BioSense')) {
            setDevices((prev) => {
              const exists = prev.find((d) => d.deviceId === result.device.deviceId);
              if (exists) return prev;
              return [...prev, result.device];
            });
          }
        }
      );

      setTimeout(async () => {
        try {
          await BleClient.stopLEScan();
        } catch {
          // Ignore stop errors
        }
        setScanning(false);
      }, 8000);
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Error al escanear: ' + (error instanceof Error ? error.message : 'Unknown'));
      setScanning(false);
    }
  };

  const handleSelectDevice = async (device: NativeDevice) => {
    try {
      const BleClient = await getBleClient();
      if (!BleClient) {
        toast.error('Bluetooth no está disponible');
        return;
      }
      
      setSelectedDevice(device);
      setLoading(true);
      
      // Desconectar primero por si está conectado
      try {
        await BleClient.disconnect(device.deviceId);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        // Ignore disconnect errors
      }
      
      // Conectar con timeout
      const connectPromise = BleClient.connect(device.deviceId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      // Leer MAC con timeout
      const readPromise = BleClient.read(device.deviceId, SERVICE_UUID, CHARACTERISTIC_UUID);
      const readTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Read timeout')), 10000)
      );
      
      const dataView = await Promise.race([readPromise, readTimeoutPromise]);
      const dec = new TextDecoder();
      const hwMac = dec.decode(dataView)
        .replace(/\u0000/g, '')
        .trim()
        .toUpperCase();
      
      if (!hwMac || hwMac.length === 0) {
        throw new Error('MAC Address vacía recibida');
      }
      
      setMacAddress(hwMac);
      toast.success('✅ Dispositivo conectado');
    } catch (err) {
      console.error('Device selection error:', err);
      setSelectedDevice(null);
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('No se pudo conectar: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };


  // Web fallback: vincular dispositivo manualmente ingresando la MAC
  const handleWebManualLink = async () => {
    const trimmedMac = macAddress.trim().toUpperCase();
    const trimmedName = deviceName.trim();

    if (!trimmedMac || !trimmedName) {
      toast.error('Por favor ingresa la MAC Address y el nombre del dispositivo');
      return;
    }
    if (!MAC_REGEX.test(trimmedMac)) {
      toast.error(`Formato de MAC incorrecto: "${trimmedMac}". Usa el formato AA:BB:CC:DD:EE:FF`);
      return;
    }

    setLoading(true);
    try {
      await linkDevice(trimmedMac, trimmedName);
      toast.success('✅ Dispositivo vinculado manualmente');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al vincular el dispositivo');
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
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const BleClient = await getBleClient();
      if (!BleClient) {
        throw new Error('Bluetooth no disponible');
      }
      
      // 1. Vincular en backend y obtener apiSecret
      toast.info('Vinculando dispositivo en servidor...');
      const normalizedMac = macAddress
        .replace(/\u0000/g, '')
        .trim()
        .replace(/-/g, ':')
        .toUpperCase();
      const normalizedName = deviceName.trim();

      if (!MAC_REGEX.test(normalizedMac)) {
        throw new Error(`Formato de MAC incorrecto: "${normalizedMac}". Usa AA:BB:CC:DD:EE:FF`);
      }
      if (!normalizedName) {
        throw new Error('Nombre del dispositivo es requerido');
      }

      const device = await linkDevice(normalizedMac, normalizedName);
      
      if (!device.apiSecret) {
        throw new Error('El servidor no devolvió el API Secret');
      }
      
      // 2. Enviar credenciales via BLE con timeout
      toast.info('Enviando configuración WiFi al ESP32...');
      
      const payload = `${wifiSsid},${wifiPassword},${device.apiSecret}`;
      const data = new TextEncoder().encode(payload);
      const dataView = new DataView(data.buffer);
      
      const writePromise = BleClient.write(
        selectedDevice.deviceId,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        dataView
      );
      
      const writeTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Write timeout - dispositivo no responde')), 20000)
      );
      
      await Promise.race([writePromise, writeTimeoutPromise]);
      
      toast.success('✅ Sincronización exitosa!\nEl ESP32 se reiniciará en 2 segundos');
      
      // Desconectar después del éxito
      setTimeout(() => {
        try {
          BleClient.disconnect(selectedDevice.deviceId).catch(() => {});
        } catch {}
      }, 1000);
      
      setTimeout(() => {
        onSuccess();
      }, 2000);
      
    } catch (error) {
      console.error('Sync error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Sincronización fallida: ' + errorMsg);
    } finally {
      setLoading(false);
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
