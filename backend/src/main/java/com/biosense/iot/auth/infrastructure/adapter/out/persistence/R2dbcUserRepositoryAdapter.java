package com.biosense.iot.auth.infrastructure.adapter.out.persistence;

import com.biosense.iot.device.domain.port.out.UserRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class R2dbcUserRepositoryAdapter implements UserRepositoryPort {

    private final DatabaseClient databaseClient;

    @Override
    public Mono<Integer> getUserIdByEmail(String email) {
        return databaseClient.sql("SELECT id FROM users WHERE email = :email")
                .bind("email", email)
                .map(row -> row.get("id", Integer.class))
                .first()
                .switchIfEmpty(Mono.error(new IllegalArgumentException("User not found: " + email)));
    }
}