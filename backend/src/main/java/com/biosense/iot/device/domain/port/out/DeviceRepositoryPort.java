package com.biosense.iot.device.domain.port.out;

import com.biosense.iot.device.domain.model.DeviceDomain;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface DeviceRepositoryPort {
    Mono<DeviceDomain> linkDeviceToUser(Integer userId, String macAddress, String deviceName);

    Flux<DeviceDomain> getUserDevices(Integer userId);

    Mono<DeviceDomain> findById(Integer deviceId);

    Mono<Void> unlinkDevice(Integer deviceId);

    Mono<DeviceDomain> findByMacAddress(String macAddress);
}