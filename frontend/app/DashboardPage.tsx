'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getDeviceReadings, type SensorReading } from '@/lib/device-service';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deviceId = searchParams.get('deviceId');

  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!deviceId) {
      router.push('/profile');
      return;
    }

    loadReadings();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadReadings, 5000);
    }

    return () => clearInterval(interval);
  }, [deviceId, autoRefresh, router]);

  const loadReadings = async () => {
    try {
      const data = await getDeviceReadings(parseInt(deviceId!), 100);
      const formattedData = data.map((reading: SensorReading) => ({
        ...reading,
        timestamp: new Date(reading.timestamp).toLocaleTimeString(),
        time: new Date(reading.timestamp).getTime()
      })).sort((a, b) => a.time - b.time);

      setReadings(formattedData);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar lecturas');
      setLoading(false);
    }
  };

  const getLatestReading = () => readings[readings.length - 1];

  const getAirQualityColor = (state: string) => {
    switch (state) {
      case 'CLEAN': return '#10b981';
      case 'WARNING': return '#f59e0b';
      case 'DANGER': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getAirQualityText = (state: string) => {
    switch (state) {
      case 'CLEAN': return '✅ Aire Limpio';
      case 'WARNING': return '⚠️ Precaución';
      case 'DANGER': return '🔴 Peligro';
      default: return 'Desconocido';
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;

  const latest = getLatestReading();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600">Dispositivo ID: {deviceId}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'default' : 'outline'}
            >
              {autoRefresh ? '⏸️ Pausar' : '▶️ Reanudar'}
            </Button>
            <Button onClick={() => router.push('/profile')} variant="outline">
              ← Volver
            </Button>
          </div>
        </div>

        {latest && (
          <Card className="mb-6 border-2" style={{ borderColor: getAirQualityColor(latest.airQualityState) }}>
            <CardHeader>
              <CardTitle>Estado Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Estado del Aire</p>
                  <p className="text-2xl font-bold" style={{ color: getAirQualityColor(latest.airQualityState) }}>
                    {getAirQualityText(latest.airQualityState)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">MQ4 (Metano)</p>
                  <p className="text-2xl font-bold">{latest.mq4.toFixed(2)} ppm</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">MQ7 (CO)</p>
                  <p className="text-2xl font-bold">{latest.mq7.toFixed(2)} ppm</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">MQ135 (Calidad Aire)</p>
                  <p className="text-2xl font-bold">{latest.mq135.toFixed(2)} ppm</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>MQ4 vs MQ7</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" angle={-45} height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="mq4" stroke="#3b82f6" name="MQ4" />
                  <Line type="monotone" dataKey="mq7" stroke="#ef4444" name="MQ7" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>MQ135 (Calidad Aire)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" angle={-45} height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="mq135" stroke="#f59e0b" name="MQ135" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Lecturas ({readings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Hora</th>
                    <th className="text-left p-2">MQ4</th>
                    <th className="text-left p-2">MQ7</th>
                    <th className="text-left p-2">MQ135</th>
                    <th className="text-left p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.slice(-10).reverse().map((reading, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">{reading.timestamp}</td>
                      <td className="p-2">{reading.mq4.toFixed(2)}</td>
                      <td className="p-2">{reading.mq7.toFixed(2)}</td>
                      <td className="p-2">{reading.mq135.toFixed(2)}</td>
                      <td className="p-2">
                        <span style={{ color: getAirQualityColor(reading.airQualityState) }}>
                          {getAirQualityText(reading.airQualityState)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}