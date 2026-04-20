package com.biosense.iot.device.application.usecase;

import com.biosense.iot.device.domain.model.DeviceDomain;
import com.biosense.iot.device.domain.port.in.LinkDeviceUseCase;
import com.biosense.iot.device.domain.port.out.DeviceRepositoryPort;
import com.biosense.iot.device.domain.port.out.UserRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class LinkDeviceUseCaseImpl implements LinkDeviceUseCase {

        private static final Logger log = LoggerFactory.getLogger(LinkDeviceUseCaseImpl.class);
        private static final Pattern MAC_PATTERN = Pattern.compile("^([0-9A-F]{2}:){5}[0-9A-F]{2}$");

        private final UserRepositoryPort userRepositoryPort;
        private final DeviceRepositoryPort deviceRepositoryPort;

        @Override
        public Mono<DeviceDomain> execute(String userEmail, String macAddress, String deviceName) {
                final String normalizedMac = normalizeMacAddress(macAddress);
                final String normalizedName = normalizeDeviceName(deviceName);

                return userRepositoryPort.getUserIdByEmail(userEmail)
                                .switchIfEmpty(Mono.error(new IllegalArgumentException("User not found: " + userEmail)))
                                .flatMap(userId -> deviceRepositoryPort.linkDeviceToUser(userId, normalizedMac,
                                                normalizedName))
                                .doOnSuccess(device -> log.info("Device linked successfully: {} to user {}",
                                                normalizedMac,
                                                userEmail))
                                .doOnError(e -> log.error("Error linking device: {}", e.getMessage(), e));
        }

        private String normalizeMacAddress(String macAddress) {
                if (macAddress == null) {
                        throw new IllegalArgumentException("MAC Address es requerida");
                }

                String normalized = macAddress
                                .trim()
                                .replace('-', ':')
                                .replaceAll("[^0-9A-Fa-f:]", "")
                                .toUpperCase(Locale.ROOT);

                if (!MAC_PATTERN.matcher(normalized).matches()) {
                        throw new IllegalArgumentException("Formato de MAC inválido. Usa AA:BB:CC:DD:EE:FF");
                }

                return normalized;
        }

        private String normalizeDeviceName(String deviceName) {
                if (deviceName == null) {
                        throw new IllegalArgumentException("Nombre del dispositivo es requerido");
                }

                String normalized = deviceName.trim();
                if (normalized.isEmpty()) {
                        throw new IllegalArgumentException("Nombre del dispositivo es requerido");
                }

                if (normalized.length() > 100) {
                        throw new IllegalArgumentException("Nombre del dispositivo demasiado largo (max 100)");
                }

                return normalized;
        }

        @Override
        public Mono<Void> unlink(String userEmail, Integer deviceId) {
                return userRepositoryPort.getUserIdByEmail(userEmail)
                                .switchIfEmpty(Mono.error(new IllegalArgumentException("User not found: " + userEmail)))
                                .flatMap(userId -> deviceRepositoryPort.findById(deviceId)
                                                .switchIfEmpty(Mono.error(
                                                                new IllegalArgumentException("Device not found")))
                                                .filter(device -> device.getUserId() != null
                                                                && device.getUserId().equals(userId))
                                                .switchIfEmpty(Mono.error(new IllegalArgumentException(
                                                                "Device does not belong to user")))
                                                .flatMap(device -> deviceRepositoryPort.unlinkDevice(deviceId)))
                                .doOnSuccess(v -> log.info("Device unlinked: {}", deviceId))
                                .doOnError(e -> log.error("Error unlinking device: {}", e.getMessage()));
        }
}