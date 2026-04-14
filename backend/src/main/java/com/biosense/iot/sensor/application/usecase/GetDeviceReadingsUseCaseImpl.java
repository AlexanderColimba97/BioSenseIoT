package com.biosense.iot.sensor.application.usecase;

import com.biosense.iot.device.domain.port.out.DeviceRepositoryPort;
import com.biosense.iot.device.domain.port.out.UserRepositoryPort;
import com.biosense.iot.sensor.domain.model.SensorReadingDomain;
import com.biosense.iot.sensor.domain.port.in.GetDeviceReadingsUseCase;
import com.biosense.iot.sensor.domain.port.out.SensorReadingRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class GetDeviceReadingsUseCaseImpl implements GetDeviceReadingsUseCase {

    private final UserRepositoryPort userRepositoryPort;
    private final DeviceRepositoryPort deviceRepositoryPort;
    private final SensorReadingRepositoryPort sensorReadingRepositoryPort;

    @Override
    public Flux<SensorReadingDomain> execute(String userEmail, Integer deviceId, Integer limit) {
        return userRepositoryPort.getUserIdByEmail(userEmail)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("User not found: " + userEmail)))
                .flatMap(userId -> deviceRepositoryPort.findById(deviceId)
                        .switchIfEmpty(Mono.error(new IllegalArgumentException("Device not found")))
                        .filter(device -> device.getUserId() != null && device.getUserId().equals(userId))
                        .switchIfEmpty(Mono.error(new IllegalArgumentException("Device does not belong to user"))))
                .flatMapMany(device -> sensorReadingRepositoryPort.getReadingsByDeviceId(deviceId, limit));
    }
}