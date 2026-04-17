package com.biosense.iot.diagnostic.domain.port.out;

import com.biosense.iot.diagnostic.domain.model.DiagnosticDomain;
import reactor.core.publisher.Mono;

public interface DiagnosticRepositoryPort {
    Mono<DiagnosticDomain> findLatestByUserId(Integer userId);
    Mono<Integer> findUserIdByEmail(String email);
    Mono<Void> save(Integer userId, Long readingId, String severity, String diagnosticText, String recommendation);
}
