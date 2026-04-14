'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUserDevices, unlinkDevice, type Device } from '@/lib/device-service';
// import { logout } from '@/lib/auth-service';
import { AuthService } from '@/lib/auth-service'; // Importa la clase
import SyncDeviceModal from '@/components/SyncDeviceModal';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(user);
    
    loadUserDevices();
    setLoading(false);
  }, [router]);

  const loadUserDevices = async () => {
    try {
      const data = await getUserDevices();
      setDevices(data);
    } catch (error) {
      console.error('Error loading devices:', error);
      toast.error('Error al cargar dispositivos');
    }
  };

  const handleLogout = () => {
  AuthService.logout(); // Llama al método estático
  router.push('/');
};

  const handleSyncSuccess = () => {
    setShowSyncModal(false);
    loadUserDevices();
  };

  const handleUnlink = async (deviceId: number) => {
    if (!confirm('¿Deseas desvinc estar este dispositivo?')) return;
    
    try {
      await unlinkDevice(deviceId);
      toast.success('Dispositivo desvinculado');
      loadUserDevices();
    } catch (error) {
      toast.error('Error al desvinc estar dispositivo');
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Mi Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg font-semibold">{user?.fullName || user?.email}</p>
                <p className="text-gray-600">{user?.email}</p>
              </div>
              <Button onClick={handleLogout} variant="destructive">
                Cerrar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Mis Dispositivos</CardTitle>
              <Button 
                onClick={() => setShowSyncModal(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                ➕ Sincronizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <p className="text-gray-500">No tienes dispositivos sincronizados</p>
            ) : (
              <div className="space-y-4">
                {devices.map((device: Device) => (
                  <div key={device.id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-semibold">{device.name}</p>
                      <p className="text-sm text-gray-600">{device.macAddress}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => router.push(`/dashboard?deviceId=${device.id}`)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Dashboard
                      </Button>
                      <Button 
                        onClick={() => handleUnlink(device.id)}
                        variant="destructive"
                      >
                        Desvinc
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showSyncModal && (
        <SyncDeviceModal 
          onClose={() => setShowSyncModal(false)}
          onSuccess={handleSyncSuccess}
        />
      )}
    </div>
  );
}