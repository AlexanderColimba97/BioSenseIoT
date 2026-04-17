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
                return databaseClient.sql(
                                "UPDATE devices SET user_id = :userId, name = :deviceName, api_secret = :apiSecret, last_seen = NOW() " +
                                                "WHERE mac_address = :macAddress " +
                                                "RETURNING id, user_id, mac_address, name, api_secret")
                                .bind("userId", userId)
                                .bind("macAddress", macAddress.toUpperCase())
                                .bind("deviceName", deviceName)
                                .bind("apiSecret", newSecret)
                                .map(row -> DeviceDomain.builder()
                                                .id(row.get("id", Integer.class))
                                                .userId(row.get("user_id", Integer.class))
                                                .macAddress(row.get("mac_address", String.class))
                                                .name(row.get("name", String.class))
                                                .apiSecret(row.get("api_secret", String.class))
                                                .build())
                                .first()
                                .switchIfEmpty(
                                                databaseClient.sql(
                                                                "INSERT INTO devices (mac_address, name, user_id, api_secret, last_seen) " +
                                                                                "VALUES (:macAddress, :deviceName, :userId, :apiSecret, NOW()) " +
                                                                                "RETURNING id, user_id, mac_address, name, api_secret")
                                                                .bind("userId", userId)
                                                                .bind("macAddress", macAddress.toUpperCase())
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
                                                                .first());
        }

        @Override
        public Flux<DeviceDomain> getUserDevices(Integer userId) {
                return databaseClient.sql(
                                "SELECT id, user_id, mac_address, name, api_secret FROM devices " +
                                                "WHERE user_id = :userId ORDER BY id DESC")
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
        public Mono<Void> unlinkDevice(Integer deviceId) {
                return databaseClient.sql("UPDATE devices SET user_id = NULL WHERE id = :deviceId")
                                .bind("deviceId", deviceId)
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
