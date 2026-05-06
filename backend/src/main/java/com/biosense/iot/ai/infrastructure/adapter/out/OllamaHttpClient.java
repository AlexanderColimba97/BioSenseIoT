package com.biosense.iot.ai.infrastructure.adapter.out;

import com.biosense.iot.ai.domain.port.out.OllamaClientPort;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OllamaHttpClient implements OllamaClientPort {

    private static final Logger log = LoggerFactory.getLogger(OllamaHttpClient.class);

    private final WebClient webClient;

    @Value("${ollama.model:}")
    private String model;

    @Value("${ollama.timeout-ms:10000}")
    private long timeoutMs;

    public OllamaHttpClient(@Value("${ollama.url:http://localhost:11434}") String ollamaUrl) {
        this.webClient = WebClient.builder().baseUrl(ollamaUrl).build();
    }

    @Override
    public Mono<String> generate(String prompt) {
        log.info("[OLLAMA] Sending prompt (len={})", prompt.length());

        Map<String, Object> body = Map.of(
                "model", model == null || model.isBlank() ? "llama2" : model,
                "prompt", prompt);

        return webClient.post()
                .uri("/api/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(BodyInserters.fromValue(body))
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMillis(timeoutMs))
                .doOnError(e -> log.error("[OLLAMA] Error calling ollama: {}", e.getMessage()));
    }
}
