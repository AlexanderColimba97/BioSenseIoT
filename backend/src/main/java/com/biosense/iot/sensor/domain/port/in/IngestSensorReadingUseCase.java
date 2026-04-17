package com.biosense.iot.sensor.domain.port.in;

import com.biosense.iot.sensor.domain.model.SensorReadingDomain;
import reactor.core.publisher.Mono;

public interface IngestSensorReadingUseCase {
    Mono<SensorReadingDomain> execute(String macAddress, String apiKey, Double mq4, Double mq7, Double mq135);
}
