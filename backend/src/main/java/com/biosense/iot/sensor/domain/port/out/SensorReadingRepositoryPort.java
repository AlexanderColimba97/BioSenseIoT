package com.biosense.iot.sensor.domain.port.out;

import com.biosense.iot.sensor.domain.model.SensorReadingDomain;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface SensorReadingRepositoryPort {
    Mono<SensorReadingDomain> save(SensorReadingDomain reading);

    Flux<SensorReadingDomain> getReadingsByDeviceId(Integer deviceId, Integer limit);
}