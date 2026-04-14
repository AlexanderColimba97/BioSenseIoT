package com.biosense.iot.sensor.infrastructure.adapter.out.persistence;

import com.biosense.iot.sensor.domain.model.SensorReadingDomain;
import com.biosense.iot.sensor.domain.port.out.DeviceRepositoryPort;
import com.biosense.iot.sensor.domain.port.out.SensorReadingRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class R2dbcSensorRepositoryAdapter implements DeviceRepositoryPort, SensorReadingRepositoryPort {

    private final DatabaseClient databaseClient;

    @Override
    public Mono<Integer> getOrCreateDeviceId(String macAddress) {
        return databaseClient.sql("SELECT id FROM devices WHERE mac_address = :mac")
                .bind("mac", macAddress.toUpperCase())
                .map(row -> row.get("id", Integer.class))
                .first()
                .switchIfEmpty(
                        databaseClient.sql(
                                "INSERT INTO devices (mac_address, name) VALUES (:mac, 'ESP32 Sensor') RETURNING id")
                                .bind("mac", macAddress.toUpperCase())
                                .map(row -> row.get("id", Integer.class))
                                .first());
    }

    @Override
    public Mono<SensorReadingDomain> save(SensorReadingDomain reading) {
        return databaseClient.sql(
                "INSERT INTO sensor_readings (device_id, mq4_value, mq7_value, mq135_value, timestamp) " +
                        "VALUES (:did, :mq4, :mq7, :mq135, NOW()) RETURNING id")
                .bind("did", reading.getDeviceId())
                .bind("mq4", reading.getMq4())
                .bind("mq7", reading.getMq7())
                .bind("mq135", reading.getMq135())
                .map(row -> row.get("id", Long.class))
                .first()
                .map(id -> {
                    reading.setId(id);
                    return reading;
                });
    }

    @Override
    public Flux<SensorReadingDomain> getReadingsByDeviceId(Integer deviceId, Integer limit) {
        return databaseClient.sql(
                "SELECT id, device_id, mq4_value, mq7_value, mq135_value, timestamp " +
                        "FROM sensor_readings WHERE device_id = :deviceId " +
                        "ORDER BY timestamp DESC LIMIT :limit")
                .bind("deviceId", deviceId)
                .bind("limit", limit)
                .map(row -> {
                    SensorReadingDomain reading = new SensorReadingDomain(
                            row.get("device_id", Integer.class),
                            row.get("mq4_value", Double.class),
                            row.get("mq7_value", Double.class),
                            row.get("mq135_value", Double.class));
                    reading.setId(row.get("id", Long.class));
                    return reading;
                })
                .all();
    }
}