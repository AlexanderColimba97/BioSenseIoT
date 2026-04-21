package com.biosense.iot.sensor.infrastructure.adapter.in.web;

import com.biosense.iot.sensor.domain.port.out.SensorReadingRepositoryPort;
import com.biosense.iot.sensor.domain.port.out.DeviceRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.*;

/**
 * DEBUG CONTROLLER - Endpoint Temporal para Inspeccionar Ingesta de Sensores
 * ⚠️ DESACTIVAR EN PRODUCCIÓN - Solo para debugging local
 * 
 * Endpoints:
 * - GET /debug/latest-reading?macAddress=XX:XX:XX:XX:XX:XX&limit=10
 * - GET /debug/sensor-stats
 * - GET /debug/device-lookup?macAddress=XX:XX:XX:XX:XX:XX
 */
@RestController
@RequestMapping("/debug")
@RequiredArgsConstructor
public class DebugSensorController {

    private final SensorReadingRepositoryPort sensorReadingRepositoryPort;
    private final DeviceRepositoryPort deviceRepositoryPort;

    /**
     * GET /debug/latest-reading?macAddress=00:00:00:00:00:00&limit=10
     * 
     * Devuelve las últimas N lecturas para un dispositivo
     * 
     * Respuesta:
     * {
     * "status": "success",
     * "macAddress": "00:00:00:00:00:00",
     * "deviceId": 5,
     * "readingsCount": 10,
     * "readings": [
     * {
     * "id": 12345,
     * "readingId": "00:00:00:00:00:00-9-712857d-75127",
     * "mq7": 74.83,
     * "mq4": 42.88,
     * "mq135": 0.00,
     * "timestamp": "2026-04-21T14:25:30Z"
     * }
     * ]
     * }
     */
    @GetMapping("/latest-reading")
    public Mono<ResponseEntity<Map<String, Object>>> getLatestReadings(
            @RequestParam String macAddress,
            @RequestParam(defaultValue = "10") Integer limit) {

        return deviceRepositoryPort.getLinkedDeviceId(macAddress)
                .flatMap(deviceId -> sensorReadingRepositoryPort.getReadingsByDeviceId(deviceId, limit)
                        .collectList()
                        .map(readings -> {
                            Map<String, Object> response = new HashMap<>();
                            response.put("status", "success");
                            response.put("macAddress", macAddress);
                            response.put("deviceId", deviceId);
                            response.put("readingsCount", readings.size());
                            response.put("readings", readings.stream().map(r -> Map.of(
                                    "id", r.getId(),
                                    "readingId", r.getReadingId(),
                                    "mq7", r.getMq7(),
                                    "mq4", r.getMq4(),
                                    "mq135", r.getMq135(),
                                    "timestamp", r.getTimestamp() != null ? r.getTimestamp().toString() : "N/A"))
                                    .toList());
                            return ResponseEntity.ok(response);
                        }))
                .onErrorResume(e -> {
                    Map<String, Object> error = new HashMap<>();
                    error.put("status", "error");
                    error.put("macAddress", macAddress);
                    error.put("message", "Device not linked or no readings found: " + e.getMessage());
                    return Mono.just(ResponseEntity.status(404).body(error));
                });
    }

    /**
     * GET /debug/device-lookup?macAddress=00:00:00:00:00:00
     * 
     * Devuelve información de resolución MAC → Device ID
     * 
     * Respuesta:
     * {
     * "macAddress": "00:00:00:00:00:00",
     * "status": "linked",
     * "deviceId": 5,
     * "userCount": 2
     * }
     * 
     * O:
     * {
     * "macAddress": "00:00:00:00:00:00",
     * "status": "not_linked",
     * "message": "Device not found or not linked to any user"
     * }
     */
    @GetMapping("/device-lookup")
    public Mono<ResponseEntity<Map<String, Object>>> deviceLookup(@RequestParam String macAddress) {
        return deviceRepositoryPort.getLinkedDeviceId(macAddress)
                .flatMap(deviceId -> deviceRepositoryPort.getUserIdsByDeviceId(deviceId)
                        .count()
                        .map(userCount -> {
                            Map<String, Object> response = new HashMap<>();
                            response.put("macAddress", macAddress);
                            response.put("status", "linked");
                            response.put("deviceId", deviceId);
                            response.put("userCount", userCount);
                            return ResponseEntity.ok(response);
                        }))
                .onErrorResume(e -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("macAddress", macAddress);
                    response.put("status", "not_linked");
                    response.put("message", "Device not found or not linked to any user");
                    response.put("error", e.getMessage());
                    return Mono.just(ResponseEntity.status(404).body(response));
                });
    }

    /**
     * GET /debug/sensor-stats
     * 
     * Devuelve estadísticas generales (ADVERTENCIA: Sin filtro puede ser lento en
     * BD grande)
     * 
     * Respuesta:
     * {
     * "status": "ok",
     * "message": "Debug endpoint - use specific macAddress for detailed stats"
     * }
     */
    @GetMapping("/sensor-stats")
    public Mono<ResponseEntity<Map<String, Object>>> sensorStats() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("message",
                "Debug endpoint - use /debug/latest-reading?macAddress=XX:XX:XX:XX:XX:XX for device stats");
        response.put("hint", "HTTP -1 on ESP32 means SSL/TLS connection timeout. Check:");
        response.put("checks", List.of(
                "1. Is backend URL reachable? Test: curl -v https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading",
                "2. Is POST /api/v2/sensors/reading endpoint registered? (Check SensorControllerV2)",
                "3. SSL certificate valid? ESP32 may need certificate pinning disabled",
                "4. Bearer token format correct? Use 'Bearer ' + apiSecret",
                "5. Request timeout? Railway backend might be slow. Use 10s+ timeout on ESP32"));
        return Mono.just(ResponseEntity.ok(response));
    }

    /**
     * GET /debug/test-endpoint
     * 
     * Verifica que el endpoint POST /api/v2/sensors/reading está activo
     */
    @GetMapping("/test-endpoint")
    public Mono<ResponseEntity<Map<String, Object>>> testEndpoint() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("endpoint", "POST /api/v2/sensors/reading");
        response.put("requires", "Authorization: Bearer <apiSecret>");
        response.put("payload", Map.of(
                "deviceId", "XX:XX:XX:XX:XX:XX (or macAddress)",
                "macAddress", "XX:XX:XX:XX:XX:XX",
                "co", 50.0,
                "ch4", 30.0,
                "airQuality", 100.0,
                "mq7", 50.0,
                "mq4", 30.0,
                "mq135", 100.0,
                "readingId", "XX:XX:XX:XX:XX:XX-bootCounter-nonce-millis",
                "timestamp", System.currentTimeMillis()));
        response.put("example_curl",
                "curl -X POST https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading " +
                        "-H 'Authorization: Bearer your_api_secret_here' " +
                        "-H 'Content-Type: application/json' " +
                        "-d '{\"macAddress\":\"00:00:00:00:00:00\",\"co\":50.0,...}'");
        return Mono.just(ResponseEntity.ok(response));
    }
}
