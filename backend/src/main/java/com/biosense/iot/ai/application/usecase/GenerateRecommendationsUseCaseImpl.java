package com.biosense.iot.ai.application.usecase;

import com.biosense.iot.ai.domain.RecommendationDomain;
import com.biosense.iot.ai.domain.port.in.GenerateRecommendationsUseCase;
import com.biosense.iot.ai.domain.port.out.OllamaClientPort;
import com.biosense.iot.pet.application.usecase.ManageProfileContextUseCase;
import com.biosense.iot.pet.domain.model.EnvironmentProfileDomain;
import com.biosense.iot.pet.domain.model.PetProfileDomain;
import com.biosense.iot.pet.domain.model.UserContextProfileDomain;
import com.biosense.iot.sensor.domain.model.SensorReadingDomain;
import com.biosense.iot.sensor.domain.port.in.GetDeviceReadingsUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GenerateRecommendationsUseCaseImpl implements GenerateRecommendationsUseCase {

    private final GetDeviceReadingsUseCase getDeviceReadingsUseCase;
    private final ManageProfileContextUseCase manageProfileContextUseCase;
    private final OllamaClientPort ollamaClientPort;

    @Override
    public Mono<RecommendationDomain> execute(String userEmail, Integer deviceId, Integer limit) {
        return manageProfileContextUseCase.getContext(userEmail)
                .zipWith(getDeviceReadingsUseCase.execute(userEmail, deviceId, limit).collectList())
                .flatMap(tuple -> ollamaClientPort
                        .generate(buildPrompt(userEmail, deviceId, tuple.getT1(), tuple.getT2()))
                        .map(this::toRecommendationDomain));
    }

    private String buildPrompt(
            String userEmail,
            Integer deviceId,
            UserContextProfileDomain profile,
            List<SensorReadingDomain> readings) {

        StringBuilder prompt = new StringBuilder();
        prompt.append("user=").append(userEmail)
                .append(" deviceId=").append(deviceId);

        if (profile != null) {
            for (PetProfileDomain pet : profile.getPets()) {
                prompt.append(" pet=").append(pet.getName());
            }

            EnvironmentProfileDomain environment = profile.getEnvironment();
            if (environment != null) {
                prompt.append(" environment=").append(environment.getSpaceType());
            }
        }

        for (SensorReadingDomain reading : readings) {
            prompt.append(" mq7=").append(reading.getMq7())
                    .append(" mq4=").append(reading.getMq4())
                    .append(" mq135=").append(reading.getMq135());
        }

        return prompt.toString();
    }

    private RecommendationDomain toRecommendationDomain(String ollamaResponse) {
        try {
            if (ollamaResponse == null || ollamaResponse.isBlank()) {
                return RecommendationDomain.builder()
                        .summary("")
                        .suggestions(List.of())
                        .build();
            }

            String trimmed = ollamaResponse.trim();
            if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
                return RecommendationDomain.builder()
                        .summary(ollamaResponse)
                        .suggestions(List.of())
                        .build();
            }

            var parsed = new com.fasterxml.jackson.databind.ObjectMapper().readTree(trimmed);
            String summary = parsed.hasNonNull("summary") ? parsed.get("summary").asText() : ollamaResponse;
            List<String> suggestions = new java.util.ArrayList<>();

            if (parsed.has("suggestions") && parsed.get("suggestions").isArray()) {
                parsed.get("suggestions").forEach(node -> suggestions.add(node.asText()));
            }

            return RecommendationDomain.builder()
                    .summary(summary)
                    .suggestions(suggestions)
                    .build();
        } catch (Exception ignored) {
            return RecommendationDomain.builder()
                    .summary(ollamaResponse)
                    .suggestions(List.of())
                    .build();
        }
    }
}