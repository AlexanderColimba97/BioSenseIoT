package com.biosense.iot.device.domain.port.out;

import reactor.core.publisher.Mono;

public interface UserRepositoryPort {
    Mono<Integer> getUserIdByEmail(String email);
}