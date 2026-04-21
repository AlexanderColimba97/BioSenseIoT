package com.biosense.iot.device.infrastructure.adapter.out.persistence;

import com.biosense.iot.device.domain.model.DeviceDomain;
import com.biosense.iot.device.domain.port.out.DeviceRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class R2dbcDeviceRepositoryAdapter implements DeviceRepositoryPort {

        private final DatabaseClient databaseClient;

        private static String generateApiSecret() {
                return "bsk_" + UUID.randomUUID().toString().replace("-", "");
        }

        @Override
        public Mono<DeviceDomain> linkDeviceToUser(Integer userId, String macAddress, String deviceName) {
                String newSecret = generateApiSecret();
                final String normalizedMac = macAddress.toUpperCase();

                return databaseClient.sql(
                                "SELECT id, user_id, mac_address, name, api_secret FROM devices WHERE mac_address = :macAddress")
                                .bind("macAddress", normalizedMac)
                                .map(row -> DeviceDomain.builder()
                                                .id(row.get("id", Integer.class))
                                                .userId(row.get("user_id", Integer.class))
                                                .macAddress(row.get("mac_address", String.class))
                                                .name(row.get("name", String.class))
                                                .apiSecret(row.get("api_secret", String.class))
                                                .build())
                                .first()
                                .flatMap(existing -> {
                                        Mono<Void> updateDevice = databaseClient.sql(
                                                        "UPDATE devices SET name = :deviceName, api_secret = COALESCE(api_secret, :apiSecret) "
                                                                        +
                                                                        "WHERE id = :deviceId")
                                                        .bind("deviceName", deviceName)
                                                        .bind("apiSecret", newSecret)
                                                        .bind("deviceId", existing.getId())
                                                        .then();

                                        String role = existing.getUserId() != null
                                                        && existing.getUserId().equals(userId)
                                                                        ? "owner"
                                                                        : "viewer";

                                        Mono<Void> addAccess = databaseClient.sql(
                                                        "INSERT INTO user_devices (user_id, device_id, role) VALUES (:userId, :deviceId, :role) "
                                                                        +
                                                                        "ON CONFLICT (user_id, device_id) DO NOTHING")
                                                        .bind("userId", userId)
                                                        .bind("deviceId", existing.getId())
                                                        .bind("role", role)
                                                        .then();

                                        return updateDevice
                                                        .then(addAccess)
                                                        .then(databaseClient.sql(
                                                                        "SELECT id, user_id, mac_address, name, api_secret FROM devices WHERE id = :deviceId")
                                                                        .bind("deviceId", existing.getId())
                                                                        .map(row -> DeviceDomain.builder()
                                                                                        .id(row.get("id",
                                                                                                        Integer.class))
                                                                                        .userId(row.get("user_id",
                                                                                                        Integer.class))
                                                                                        .macAddress(row.get(
                                                                                                        "mac_address",
                                                                                                        String.class))
                                                                                        .name(row.get("name",
                                                                                                        String.class))
                                                                                        .apiSecret(row.get("api_secret",
                                                                                                        String.class))
                                                                                        .build())
                                                                        .first());
                                })
                                .switchIfEmpty(
                                                databaseClient.sql(
                                                                "INSERT INTO devices (mac_address, name, user_id, api_secret) VALUES (:macAddress, :deviceName, :userId, :apiSecret) "
                                                                                +
                                                                                "RETURNING id, user_id, mac_address, name, api_secret")
                                                                .bind("userId", userId)
                                                                .bind("macAddress", normalizedMac)
                                                                .bind("deviceName", deviceName)
                                                                .bind("apiSecret", newSecret)
                                                                .map(row -> DeviceDomain.builder()
                                                                                .id(row.get("id", Integer.class))
                                                                                .userId(row.get("user_id",
                                                                                                Integer.class))
                                                                                .macAddress(row.get("mac_address",
                                                                                                String.class))
                                                                                .name(row.get("name", String.class))
                                                                                .apiSecret(row.get("api_secret",
                                                                                                String.class))
                                                                                .build())
                                                                .first()
                                                                .flatMap(device -> databaseClient.sql(
                                                                                "INSERT INTO user_devices (user_id, device_id, role) VALUES (:userId, :deviceId, 'owner') "
                                                                                                +
                                                                                                "ON CONFLICT (user_id, device_id) DO NOTHING")
                                                                                .bind("userId", userId)
                                                                                .bind("deviceId", device.getId())
                                                                                .then()
                                                                                .thenReturn(device)));
        }

        @Override
        public Flux<DeviceDomain> getUserDevices(Integer userId) {
                return databaseClient.sql(
                                "SELECT d.id, d.user_id, d.mac_address, d.name, d.api_secret FROM devices d " +
                                                "INNER JOIN user_devices ud ON d.id = ud.device_id " +
                                                "WHERE ud.user_id = :userId ORDER BY d.id DESC")
                                .bind("userId", userId)
                                .map(row -> DeviceDomain.builder()
                                                .id(row.get("id", Integer.class))
                                                .userId(row.get("user_id", Integer.class))
                                                .macAddress(row.get("mac_address", String.class))
                                                .name(row.get("name", String.class))
                                                .apiSecret(row.get("api_secret", String.class))
                                                .build())
                                .all();
        }

        @Override
        public Mono<DeviceDomain> findById(Integer deviceId) {
                return databaseClient.sql(
                                "SELECT id, user_id, mac_address, name, api_secret FROM devices WHERE id = :deviceId")
                                .bind("deviceId", deviceId)
                                .map(row -> DeviceDomain.builder()
                                                .id(row.get("id", Integer.class))
                                                .userId(row.get("user_id", Integer.class))
                                                .macAddress(row.get("mac_address", String.class))
                                                .name(row.get("name", String.class))
                                                .apiSecret(row.get("api_secret", String.class))
                                                .build())
                                .first();
        }

        @Override
        public Mono<Void> unlinkDevice(Integer deviceId, Integer userId) {
                return databaseClient.sql("DELETE FROM user_devices WHERE device_id = :deviceId AND user_id = :userId")
                                .bind("deviceId", deviceId)
                                .bind("userId", userId)
                                .then();
        }

        @Override
        public Mono<DeviceDomain> findByMacAddress(String macAddress) {
                return databaseClient.sql(
                                "SELECT id, user_id, mac_address, name, api_secret FROM devices WHERE mac_address = :macAddress")
                                .bind("macAddress", macAddress.toUpperCase())
                                .map(row -> DeviceDomain.builder()
                                                .id(row.get("id", Integer.class))
                                                .userId(row.get("user_id", Integer.class))
                                                .macAddress(row.get("mac_address", String.class))
                                                .name(row.get("name", String.class))
                                                .apiSecret(row.get("api_secret", String.class))
                                                .build())
                                .first();
        }
}
