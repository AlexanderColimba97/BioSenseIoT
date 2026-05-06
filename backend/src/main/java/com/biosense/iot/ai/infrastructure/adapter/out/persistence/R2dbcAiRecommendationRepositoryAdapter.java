package com.biosense.iot.ai.infrastructure.adapter.out.persistence;

import com.biosense.iot.ai.domain.model.AiRecommendationDomain;
import com.biosense.iot.ai.domain.port.out.AiRecommendationRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class R2dbcAiRecommendationRepositoryAdapter implements AiRecommendationRepositoryPort {

    private final DatabaseClient databaseClient;

    @Override
    public Mono<AiRecommendationDomain> save(AiRecommendationDomain recommendation) {
        Instant createdAt = recommendation.getCreatedAt() != null ? recommendation.getCreatedAt() : Instant.now();

        return databaseClient.sql(
                "INSERT INTO ai_recommendations (" +
                        "user_id, diagnostic_id, reading_id, pet_id, ollama_prompt, ai_response, " +
                        "recommendation_title, recommendation_text, suggested_actions, confidence_score, " +
                        "processing_time_ms, generation_status, error_message, created_at" +
                        ") VALUES (" +
                        ":userId, :diagnosticId, :readingId, :petId, :ollamaPrompt, :aiResponse, " +
                        ":recommendationTitle, :recommendationText, :suggestedActions, :confidenceScore, " +
                        ":processingTimeMs, :generationStatus, :errorMessage, :createdAt" +
                        ") RETURNING id")
                .bind("userId", recommendation.getUserId())
                .bind("diagnosticId", recommendation.getDiagnosticId())
                .bind("readingId", recommendation.getReadingId())
                .bind("petId", recommendation.getPetId())
                .bind("ollamaPrompt", recommendation.getOllamaPrompt())
                .bind("aiResponse", recommendation.getAiResponse())
                .bind("recommendationTitle", recommendation.getRecommendationTitle())
                .bind("recommendationText", recommendation.getRecommendationText())
                .bind("suggestedActions", recommendation.getSuggestedActions())
                .bind("confidenceScore", recommendation.getConfidenceScore())
                .bind("processingTimeMs", recommendation.getProcessingTimeMs())
                .bind("generationStatus", recommendation.getGenerationStatus())
                .bind("errorMessage", recommendation.getErrorMessage())
                .bind("createdAt", createdAt)
                .map((row, metadata) -> row.get("id", Long.class))
                .first()
                .map(id -> {
                    recommendation.setId(id);
                    recommendation.setCreatedAt(createdAt);
                    return recommendation;
                });
    }

    @Override
    public Mono<AiRecommendationDomain> findLatestByUserId(Integer userId) {
        return databaseClient.sql(
                "SELECT * FROM ai_recommendations WHERE user_id = :userId " +
                        "ORDER BY created_at DESC LIMIT 1")
                .bind("userId", userId)
                .map((row, metadata) -> toDomain(row))
                .first();
    }

    @Override
    public Mono<AiRecommendationDomain> findByReadingId(Long readingId) {
        return databaseClient.sql(
                "SELECT * FROM ai_recommendations WHERE reading_id = :readingId " +
                        "ORDER BY created_at DESC LIMIT 1")
                .bind("readingId", readingId)
                .map((row, metadata) -> toDomain(row))
                .first();
    }

    @Override
    public Mono<AiRecommendationDomain> findByDiagnosticId(Integer diagnosticId) {
        return databaseClient.sql(
                "SELECT * FROM ai_recommendations WHERE diagnostic_id = :diagnosticId " +
                        "ORDER BY created_at DESC LIMIT 1")
                .bind("diagnosticId", diagnosticId)
                .map((row, metadata) -> toDomain(row))
                .first();
    }

    @Override
    public Flux<AiRecommendationDomain> findRecentByUserId(Integer userId, int limit) {
        return databaseClient.sql(
                "SELECT * FROM ai_recommendations WHERE user_id = :userId " +
                        "ORDER BY created_at DESC LIMIT :limit")
                .bind("userId", userId)
                .bind("limit", limit)
                .map((row, metadata) -> toDomain(row))
                .all();
    }

    @Override
    public Mono<AiRecommendationDomain> findByIdAndUserId(Long recommendationId, Integer userId) {
        return databaseClient.sql(
                "SELECT * FROM ai_recommendations WHERE id = :id AND user_id = :userId")
                .bind("id", recommendationId)
                .bind("userId", userId)
                .map((row, metadata) -> toDomain(row))
                .first();
    }

    private AiRecommendationDomain toDomain(io.r2dbc.spi.Readable row) {
        return AiRecommendationDomain.builder()
                .id(row.get("id", Long.class))
                .userId(row.get("user_id", Integer.class))
                .diagnosticId(row.get("diagnostic_id", Integer.class))
                .readingId(row.get("reading_id", Long.class))
                .petId(row.get("pet_id", Integer.class))
                .ollamaPrompt(row.get("ollama_prompt", String.class))
                .aiResponse(row.get("ai_response", String.class))
                .recommendationTitle(row.get("recommendation_title", String.class))
                .recommendationText(row.get("recommendation_text", String.class))
                .suggestedActions(row.get("suggested_actions", String.class))
                .confidenceScore(row.get("confidence_score", Double.class))
                .processingTimeMs(row.get("processing_time_ms", Long.class))
                .generationStatus(row.get("generation_status", String.class))
                .errorMessage(row.get("error_message", String.class))
                .createdAt(row.get("created_at", Instant.class))
                .build();
    }
}
