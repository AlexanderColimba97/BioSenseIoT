package com.biosense.iot.ai.infrastructure.adapter.out.ollama;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.biosense.iot.ai.domain.port.out.OllamaClientPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class OllamaClient implements OllamaClientPort {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.model:llama2}")
    private String ollamaModel;

    @Value("${ollama.timeout-ms:30000}")
    private long timeoutMs;

    /**
     * Genera una recomendación contextual usando Ollama de forma reactiva y
     * no-bloqueante.
     * 
     * @param prompt Prompt contextualizado con datos del sensor, mascota y entorno
     * @return Mono con la recomendación generada, o error si Ollama falla
     */
    public Mono<OllamaResponse> generateRecommendation(String prompt) {
        log.info("Iniciando generación de recomendación con Ollama. Modelo: {}", ollamaModel);

        Instant startTime = Instant.now();

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", ollamaModel);
        requestBody.put("prompt", prompt);
        requestBody.put("stream", false);

        return webClient.post()
                .uri(ollamaBaseUrl + "/api/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMillis(timeoutMs))
                .flatMap(response -> parseOllamaResponse(response, startTime))
                .onErrorResume(error -> handleOllamaError(error, startTime))
                .doOnError(e -> log.error("Error en OllamaClient: {}", e.getMessage(), e));
    }

    @Override
    public Mono<String> generate(String prompt) {
        return generateRecommendation(prompt)
                .map(OllamaResponse::getRawResponse);
    }

    /**
     * Parsea la respuesta de Ollama extrayendo JSON y limpiando formato markdown
     */
    private Mono<OllamaResponse> parseOllamaResponse(String rawResponse, Instant startTime) {
        try {
            log.debug("Respuesta cruda de Ollama (primeros 500 chars): {}",
                    rawResponse.substring(0, Math.min(500, rawResponse.length())));

            JsonNode rootNode = objectMapper.readTree(rawResponse);
            String responseText = rootNode.get("response").asText("");

            long processingTimeMs = Duration.between(startTime, Instant.now()).toMillis();

            // Limpiar markdown code blocks
            String cleanedResponse = cleanMarkdownJson(responseText);

            // Intentar parsear como JSON
            try {
                JsonNode jsonRecommendation = objectMapper.readTree(cleanedResponse);
                return Mono.just(OllamaResponse.builder()
                        .rawResponse(responseText)
                        .parsedJson(cleanedResponse)
                        .title(jsonRecommendation.path("title").asText("Recomendación de seguridad"))
                        .text(jsonRecommendation.path("text").asText(responseText))
                        .actions(objectMapper.writeValueAsString(jsonRecommendation.path("actions")))
                        .processingTimeMs(processingTimeMs)
                        .status("SUCCESS")
                        .build());
            } catch (Exception e) {
                log.warn("No se pudo parsear JSON de respuesta, usando texto completo: {}", e.getMessage());
                // Fallback: usar la respuesta de texto completo
                return Mono.just(OllamaResponse.builder()
                        .rawResponse(responseText)
                        .parsedJson("")
                        .title("Recomendación de seguridad")
                        .text(responseText)
                        .actions("[]")
                        .processingTimeMs(processingTimeMs)
                        .status("SUCCESS")
                        .build());
            }
        } catch (Exception e) {
            log.error("Error parseando respuesta de Ollama: {}", e.getMessage(), e);
            return Mono.error(new OllamaParseException("Error parseando respuesta de Ollama", e));
        }
    }

    /**
     * Limpia bloques de código markdown (```json ... ```) de la respuesta
     */
    private String cleanMarkdownJson(String text) {
        // Buscar primer { y último }
        int firstBrace = text.indexOf('{');
        int lastBrace = text.lastIndexOf('}');

        if (firstBrace != -1 && lastBrace != -1 && firstBrace < lastBrace) {
            return text.substring(firstBrace, lastBrace + 1);
        }

        // Si no hay braces, limpiar markdown
        text = text.replaceAll("```json\\s*", "").replaceAll("```\\s*", "");
        return text;
    }

    /**
     * Maneja errores de Ollama con fallback apropiado
     */
    private Mono<OllamaResponse> handleOllamaError(Throwable error, Instant startTime) {
        long processingTimeMs = Duration.between(startTime, Instant.now()).toMillis();

        if (error instanceof java.util.concurrent.TimeoutException) {
            log.warn("Timeout en Ollama después de {}ms", timeoutMs);
            return Mono.just(OllamaResponse.builder()
                    .rawResponse("")
                    .parsedJson("")
                    .title("Recomendación no disponible")
                    .text("El sistema de IA está procesando. Intenta nuevamente en unos momentos.")
                    .actions("[]")
                    .processingTimeMs(processingTimeMs)
                    .status("TIMEOUT")
                    .errorMessage("Timeout después de " + timeoutMs + "ms")
                    .build());
        }

        if (error instanceof WebClientResponseException) {
            WebClientResponseException wcex = (WebClientResponseException) error;
            log.error("Error HTTP de Ollama: {} - {}", wcex.getStatusCode(), wcex.getResponseBodyAsString());
            return Mono.just(OllamaResponse.builder()
                    .rawResponse("")
                    .parsedJson("")
                    .title("Servicio de IA no disponible")
                    .text("El sistema de IA no está disponible en este momento. Por favor, intenta más tarde.")
                    .actions("[]")
                    .processingTimeMs(processingTimeMs)
                    .status("ERROR")
                    .errorMessage("Error HTTP: " + wcex.getStatusCode())
                    .build());
        }

        log.error("Error inesperado en Ollama: {}", error.getClass().getSimpleName(), error);
        return Mono.just(OllamaResponse.builder()
                .rawResponse("")
                .parsedJson("")
                .title("Error en recomendación")
                .text("Ocurrió un error generando la recomendación. Por favor, intenta nuevamente.")
                .actions("[]")
                .processingTimeMs(processingTimeMs)
                .status("ERROR")
                .errorMessage(error.getMessage())
                .build());
    }

    /**
     * DTO para la respuesta de Ollama
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class OllamaResponse {
        private String rawResponse;
        private String parsedJson;
        private String title;
        private String text;
        private String actions;
        private long processingTimeMs;
        private String status; // SUCCESS, TIMEOUT, ERROR
        private String errorMessage;
    }

    public static class OllamaParseException extends RuntimeException {
        public OllamaParseException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
