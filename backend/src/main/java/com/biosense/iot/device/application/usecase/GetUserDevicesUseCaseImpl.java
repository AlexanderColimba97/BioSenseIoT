package com.biosense.iot.device.application.usecase;

import com.biosense.iot.device.domain.model.DeviceDomain;
import com.biosense.iot.device.domain.port.in.GetUserDevicesUseCase;
import com.biosense.iot.device.domain.port.out.DeviceRepositoryPort;
import com.biosense.iot.device.domain.port.out.UserRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class GetUserDevicesUseCaseImpl implements GetUserDevicesUseCase {

    private final UserRepositoryPort userRepositoryPort;
    private final DeviceRepositoryPort deviceRepositoryPort;

    @Override
    public Flux<DeviceDomain> execute(String userEmail) {
        return userRepositoryPort.getUserIdByEmail(userEmail)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("User not found: " + userEmail)))
                .flatMapMany(deviceRepositoryPort::getUserDevices);
    }
}