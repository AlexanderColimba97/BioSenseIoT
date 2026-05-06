package com.biosense.iot.ai.domain.port.out;

import com.biosense.iot.ai.domain.model.AiRecommendationDomain;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface AiRecommendationRepositoryPort {

    /**
     * Guarda una recomendación de IA generada
     */
    Mono<AiRecommendationDomain> save(AiRecommendationDomain recommendation);

    /**
     * Obtiene la última recomendación para un usuario
     */
    Mono<AiRecommendationDomain> findLatestByUserId(Integer userId);

    /**
     * Obtiene recomendaciones por lectura de sensor
     */
    Mono<AiRecommendationDomain> findByReadingId(Long readingId);

    /**
     * Obtiene recomendaciones por diagnóstico
     */
    Mono<AiRecommendationDomain> findByDiagnosticId(Integer diagnosticId);

    /**
     * Obtiene últimas recomendaciones de un usuario (hasta 10)
     */
    Flux<AiRecommendationDomain> findRecentByUserId(Integer userId, int limit);

    /**
     * Obtiene una recomendación por id validando pertenencia al usuario.
     */
    Mono<AiRecommendationDomain> findByIdAndUserId(Long recommendationId, Integer userId);
}
