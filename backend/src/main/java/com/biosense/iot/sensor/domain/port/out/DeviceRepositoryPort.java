package com.biosense.iot.sensor.domain.port.out;

import reactor.core.publisher.Mono;

public interface DeviceRepositoryPort {
    Mono<Integer> getLinkedDeviceId(String macAddress);
    Mono<String> getApiSecretByMacAddress(String macAddress);
    Mono<Void> storeApiSecretByMacAddress(String macAddress, String apiSecret);
    Mono<Integer> getUserIdByDeviceId(Integer deviceId);
}
