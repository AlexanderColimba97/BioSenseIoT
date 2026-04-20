package com.biosense.iot.auth.infrastructure.adapter.out.persistence;

import com.biosense.iot.exception.AuthException;
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
        String normalizedEmail = email == null ? "" : email.trim();
        if (normalizedEmail.isEmpty()) {
            return Mono.error(new AuthException("Sesion invalida: email ausente en token"));
        }

        return databaseClient.sql("SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(:email))")
                .bind("email", normalizedEmail)
                .map(row -> row.get("id", Integer.class))
                .first()
                .switchIfEmpty(Mono.error(new AuthException("Sesion invalida: usuario no encontrado")));
    }
}