package com.biosense.iot.sensor.domain.port.out;

import reactor.core.publisher.Mono;

public interface DeviceRepositoryPort {
    Mono<Integer> getLinkedDeviceId(String macAddress);
}
