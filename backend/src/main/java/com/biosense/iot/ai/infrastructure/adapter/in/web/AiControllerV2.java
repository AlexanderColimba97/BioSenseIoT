package com.biosense.iot.ai.infrastructure.adapter.in.web;

import com.biosense.iot.ai.domain.model.AiRecommendationDomain;
import com.biosense.iot.ai.domain.port.in.GenerateRecommendationsUseCase;
import com.biosense.iot.ai.domain.port.out.AiRecommendationRepositoryPort;
import com.biosense.iot.auth.domain.port.out.UserRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({ "/api/ai", "/api/v2/ai" })
@RequiredArgsConstructor
public class AiControllerV2 {

        private static final Logger log = LoggerFactory.getLogger(AiControllerV2.class);

        private final GenerateRecommendationsUseCase generateRecommendationsUseCase;
        private final AiRecommendationRepositoryPort aiRecommendationRepositoryPort;
        private final UserRepositoryPort userRepositoryPort;

        @GetMapping("/recommendations")
        public Mono<ResponseEntity<Object>> getRecommendations(
                        @RequestParam Integer deviceId,
                        @RequestParam(required = false, defaultValue = "10") Integer limit,
                        Authentication authentication) {

                String userEmail = authentication.getName();

                return generateRecommendationsUseCase.execute(userEmail, deviceId, limit)
                                .map(rec -> ResponseEntity.ok((Object) Map.of(
                                                "summary", rec.getSummary(),
                                                "suggestions", rec.getSuggestions())))
                                .onErrorResume(e -> {
                                        log.error("[AI] Recommendation error for user={} device={} : {}", userEmail,
                                                        deviceId,
                                                        e.getMessage());
                                        return Mono
                                                        .just(ResponseEntity.internalServerError().body(
                                                                        (Object) Map.of("error", e.getMessage())));
                                });
        }

        @GetMapping("/ollama/latest")
        public Mono<ResponseEntity<Object>> getLatestOllamaRecommendation(Authentication authentication) {
                return extractUserIdFromAuth(authentication)
                                .flatMap(userId -> aiRecommendationRepositoryPort.findLatestByUserId(userId)
                                                .map(this::toResponseMap)
                                                .map(body -> ResponseEntity.ok((Object) body))
                                                .switchIfEmpty(Mono.just(ResponseEntity.noContent().build())))
                                .onErrorResume(e -> {
                                        log.error("[AI Ollama] Error getting latest recommendation: {}",
                                                        e.getMessage());
                                        return Mono.just(ResponseEntity.badRequest()
                                                        .body((Object) Map.of("error",
                                                                        "No se pudo identificar al usuario")));
                                });
        }

        @GetMapping("/ollama/recent")
        public Mono<ResponseEntity<Object>> getRecentOllamaRecommendations(
                        @RequestParam(required = false, defaultValue = "10") Integer limit,
                        Authentication authentication) {

                int boundedLimit = Math.max(1, Math.min(limit, 20));

                return extractUserIdFromAuth(authentication)
                                .flatMap(userId -> aiRecommendationRepositoryPort
                                                .findRecentByUserId(userId, boundedLimit)
                                                .map(this::toResponseMap)
                                                .collectList()
                                                .map(recs -> ResponseEntity.ok((Object) Map.of(
                                                                "count", recs.size(),
                                                                "recommendations", recs))))
                                .onErrorResume(e -> {
                                        log.error("[AI Ollama] Error getting recent recommendations: {}",
                                                        e.getMessage());
                                        return Mono.just(ResponseEntity.badRequest()
                                                        .body((Object) Map.of("error",
                                                                        "No se pudo identificar al usuario")));
                                });
        }

        @GetMapping("/ollama/{recommendationId}")
        public Mono<ResponseEntity<Object>> getOllamaRecommendation(
                        @PathVariable Long recommendationId,
                        Authentication authentication) {

                return extractUserIdFromAuth(authentication)
                                .flatMap(userId -> aiRecommendationRepositoryPort
                                                .findByIdAndUserId(recommendationId, userId)
                                                .map(this::toResponseMap)
                                                .map(body -> ResponseEntity.ok((Object) body))
                                                .switchIfEmpty(Mono.just(ResponseEntity.notFound().build())))
                                .onErrorResume(e -> {
                                        log.error("[AI Ollama] Error getting recommendation {}: {}", recommendationId,
                                                        e.getMessage());
                                        return Mono.just(ResponseEntity.badRequest()
                                                        .body((Object) Map.of("error",
                                                                        "No se pudo identificar al usuario")));
                                });
        }

        private Mono<Integer> extractUserIdFromAuth(Authentication authentication) {
                if (authentication == null) {
                        return Mono.error(new IllegalArgumentException("Authentication is required"));
                }

                Object principal = authentication.getPrincipal();
                if (principal instanceof Jwt jwt) {
                        Integer fromClaim = parseIntegerClaim(jwt.getClaims().get("userId"));
                        if (fromClaim != null) {
                                return Mono.just(fromClaim);
                        }
                        Integer fromSnakeClaim = parseIntegerClaim(jwt.getClaims().get("user_id"));
                        if (fromSnakeClaim != null) {
                                return Mono.just(fromSnakeClaim);
                        }
                }

                String email = authentication.getName();
                if (email == null || email.isBlank()) {
                        return Mono.error(
                                        new IllegalArgumentException("Cannot resolve user email from authentication"));
                }

                return userRepositoryPort.findByEmail(email)
                                .map(user -> user.getId())
                                .switchIfEmpty(Mono.error(new IllegalArgumentException(
                                                "User not found for authenticated email")));
        }

        private Integer parseIntegerClaim(Object value) {
                if (value == null) {
                        return null;
                }
                if (value instanceof Integer i) {
                        return i;
                }
                if (value instanceof Number n) {
                        return n.intValue();
                }
                if (value instanceof String s && !s.isBlank()) {
                        try {
                                return Integer.parseInt(s.trim());
                        } catch (NumberFormatException ignored) {
                                return null;
                        }
                }
                return null;
        }

        private Map<String, Object> toResponseMap(AiRecommendationDomain rec) {
                return Map.of(
                                "id", rec.getId(),
                                "title",
                                rec.getRecommendationTitle() == null ? "Recomendación de seguridad"
                                                : rec.getRecommendationTitle(),
                                "text",
                                rec.getRecommendationText() == null ? "Siga medidas preventivas y monitoree el entorno."
                                                : rec.getRecommendationText(),
                                "actions", rec.getSuggestedActions() == null ? "[]" : rec.getSuggestedActions(),
                                "confidence", rec.getConfidenceScore() == null ? 0.0 : rec.getConfidenceScore(),
                                "processingTimeMs", rec.getProcessingTimeMs() == null ? 0L : rec.getProcessingTimeMs(),
                                "status", rec.getGenerationStatus() == null ? "ERROR" : rec.getGenerationStatus(),
                                "errorMessage", rec.getErrorMessage() == null ? "" : rec.getErrorMessage(),
                                "createdAt", rec.getCreatedAt());
        }
}
