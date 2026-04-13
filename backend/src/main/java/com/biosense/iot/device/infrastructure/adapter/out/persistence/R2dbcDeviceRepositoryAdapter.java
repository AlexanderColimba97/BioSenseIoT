package com.biosense.iot.device.infrastructure.adapter.out.persistence;

import com.biosense.iot.device.domain.model.DeviceDomain;
import com.biosense.iot.device.domain.port.out.DeviceRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class R2dbcDeviceRepositoryAdapter implements DeviceRepositoryPort {

    private final DatabaseClient databaseClient;

    @Override
    public Mono<String> findLastActiveMacAddress() {
        // Buscar la MAC del último sensor_reading usando device_id y la tabla devices
        return databaseClient.sql("SELECT d.mac_address FROM sensor_readings sr " +
                "JOIN devices d ON d.id = sr.device_id " +
                "WHERE sr.id = (SELECT MAX(id) FROM sensor_readings) " +
                "LIMIT 1")
                .map(row -> row.get("mac_address", String.class))
                .first();
    }

    @Override
    public Mono<DeviceDomain> linkDeviceToUser(String macAddress, Integer userId) {
        // Primero verificar si el dispositivo ya existe
        return databaseClient.sql("SELECT id, mac_address, name, user_id FROM devices WHERE mac_address = :mac")
                .bind("mac", macAddress)
                .map(row -> DeviceDomain.builder()
                        .id(row.get("id", Integer.class))
                        .macAddress(row.get("mac_address", String.class))
                        .name(row.get("name", String.class))
                        .userId(row.get("user_id", Integer.class))
                        .build())
                .first()
                .flatMap(existingDevice -> {
                    // Si ya existe, solo actualizar el user_id
                    return databaseClient
                            .sql("UPDATE devices SET user_id = :userId, name = 'Mi BioSense' WHERE mac_address = :mac")
                            .bind("userId", userId)
                            .bind("mac", macAddress)
                            .fetch()
                            .rowsUpdated()
                            .then(databaseClient
                                    .sql("SELECT id, mac_address, name, user_id FROM devices WHERE mac_address = :mac")
                                    .bind("mac", macAddress)
                                    .map(row -> DeviceDomain.builder()
                                            .id(row.get("id", Integer.class))
                                            .macAddress(row.get("mac_address", String.class))
                                            .name(row.get("name", String.class))
                                            .userId(row.get("user_id", Integer.class))
                                            .build())
                                    .first());
                })
                .switchIfEmpty(
                        // Si no existe, crear el dispositivo primero
                        databaseClient.sql(
                                "INSERT INTO devices (mac_address, name, user_id) VALUES (:mac, 'Mi BioSense', :userId) RETURNING id")
                                .bind("mac", macAddress)
                                .bind("userId", userId)
                                .map(row -> row.get("id", Integer.class))
                                .first()
                                .flatMap(newId -> databaseClient
                                        .sql("SELECT id, mac_address, name, user_id FROM devices WHERE id = :id")
                                        .bind("id", newId)
                                        .map(row -> DeviceDomain.builder()
                                                .id(row.get("id", Integer.class))
                                                .macAddress(row.get("mac_address", String.class))
                                                .name(row.get("name", String.class))
                                                .userId(row.get("user_id", Integer.class))
                                                .build())
                                        .first()));
    }

    @Override
    public Mono<Integer> findUserIdByEmail(String email) {
        return databaseClient.sql("SELECT id FROM users WHERE email = :email")
                .bind("email", email)
                .map(row -> row.get("id", Integer.class))
                .first();
    }

    @Override
    public Mono<DeviceDomain> findByUserEmail(String email) {
        return databaseClient.sql("SELECT d.id, d.mac_address, d.name, d.user_id FROM devices d " +
                "JOIN users u ON u.id = d.user_id WHERE u.email = :email")
                .bind("email", email)
                .map(row -> DeviceDomain.builder()
                        .id(row.get("id", Integer.class))
                        .macAddress(row.get("mac_address", String.class))
                        .name(row.get("name", String.class))
                        .userId(row.get("user_id", Integer.class))
                        .build())
                .first();
    }

    @Override
    public Mono<Integer> getOrCreateDeviceId(String macAddress) {
        // Primero verificar si el dispositivo ya existe
        return databaseClient.sql("SELECT id FROM devices WHERE mac_address = :mac")
                .bind("mac", macAddress)
                .map(row -> row.get("id", Integer.class))
                .first()
                .switchIfEmpty(
                        // Si no existe, crear el dispositivo sin user_id
                        databaseClient.sql(
                                "INSERT INTO devices (mac_address, name) VALUES (:mac, 'BioSense Device') RETURNING id")
                                .bind("mac", macAddress)
                                .map(row -> row.get("id", Integer.class))
                                .first());
    }
}
