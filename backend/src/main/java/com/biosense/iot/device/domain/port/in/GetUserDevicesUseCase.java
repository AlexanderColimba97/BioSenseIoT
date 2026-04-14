package com.biosense.iot.device.domain.port.in;

import com.biosense.iot.device.domain.model.DeviceDomain;
import reactor.core.publisher.Flux;

public interface GetUserDevicesUseCase {
    Flux<DeviceDomain> execute(String userEmail);
}