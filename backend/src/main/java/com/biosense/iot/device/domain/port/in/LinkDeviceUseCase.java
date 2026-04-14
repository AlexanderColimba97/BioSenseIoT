package com.biosense.iot.device.domain.port.in;

import com.biosense.iot.device.domain.model.DeviceDomain;
import reactor.core.publisher.Mono;

public interface LinkDeviceUseCase {
    Mono<DeviceDomain> execute(String userEmail, String macAddress, String deviceName);

    Mono<Void> unlink(String userEmail, Integer deviceId);
}