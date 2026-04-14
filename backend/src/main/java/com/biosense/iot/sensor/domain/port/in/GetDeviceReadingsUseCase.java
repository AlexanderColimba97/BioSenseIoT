package com.biosense.iot.sensor.domain.port.in;

import com.biosense.iot.sensor.domain.model.SensorReadingDomain;
import reactor.core.publisher.Flux;

public interface GetDeviceReadingsUseCase {
    Flux<SensorReadingDomain> execute(String userEmail, Integer deviceId, Integer limit);
}