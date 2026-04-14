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

@Service
@RequiredArgsConstructor
public class LinkDeviceUseCaseImpl implements LinkDeviceUseCase {

        private static final Logger log = LoggerFactory.getLogger(LinkDeviceUseCaseImpl.class);

        private final UserRepositoryPort userRepositoryPort;
        private final DeviceRepositoryPort deviceRepositoryPort;

        @Override
        public Mono<DeviceDomain> execute(String userEmail, String macAddress, String deviceName) {
                return userRepositoryPort.getUserIdByEmail(userEmail)
                                .switchIfEmpty(Mono.error(new IllegalArgumentException("User not found: " + userEmail)))
                                .flatMap(userId -> deviceRepositoryPort.linkDeviceToUser(userId, macAddress,
                                                deviceName))
                                .doOnSuccess(device -> log.info("Device linked successfully: {} to user {}", macAddress,
                                                userEmail))
                                .doOnError(e -> log.error("Error linking device: {}", e.getMessage()));
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