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
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GenerateRecommendationsUseCaseImpl implements GenerateRecommendationsUseCase {

    private final GetDeviceReadingsUseCase getDeviceReadingsUseCase;
    private final ManageProfileContextUseCase manageProfileContextUseCase;
    private final OllamaClientPort ollamaClientPort;

    @Override
    public Mono<RecommendationDomain> execute(String userEmail, Integer deviceId, Integer limit) {
        Flux<SensorReadingDomain> readingsFlux = getDeviceReadingsUseCase.execute(userEmail, deviceId, limit);

        return manageProfileContextUseCase.getContext(userEmail)
                .flatMap(profile -> readingsFlux.collectList()
                        .flatMap(readings -> buildPromptAndGenerate(profile, readings)));
    }

    private Mono<RecommendationDomain> buildPromptAndGenerate(UserContextProfileDomain profileContext,
            List<SensorReadingDomain> readings) {
        StringBuilder sb = new StringBuilder();
        sb.append(
                "You are a helpful assistant that provides actionable recommendations for pet owners based on sensor readings and user/pet profile.\n");
        sb.append("Provide a short summary and up to 5 clear suggestions. Use plain language.\n\n");
        sb.append("User email: ").append(profileContext.getEmail()).append("\n");
        sb.append("Pets:\n");
        if (profileContext.getPets() == null || profileContext.getPets().isEmpty()) {
            sb.append("- No pets registered\n");
        } else {
            for (PetProfileDomain pet : profileContext.getPets()) {
                sb.append("- ")
                        .append(pet.getName())
                        .append(" (")
                        .append(pet.getSpecies())
                        .append(") age=")
                        .append(pet.getAgeYears())
                        .append(" sensitivity=")
                        .append(pet.getSensitivityLevel())
                        .append(" respiratoryRisk=")
                        .append(pet.getRespiratoryRisk())
                        .append(" activity=")
                        .append(pet.getActivityLevel())
                        .append("\n");
            }
        }

        EnvironmentProfileDomain environment = profileContext.getEnvironment();
        if (environment != null) {
            sb.append("Environment:\n")
                    .append("- profileName=").append(environment.getProfileName()).append("\n")
                    .append("- spaceType=").append(environment.getSpaceType()).append("\n")
                    .append("- areaType=").append(environment.getAreaType()).append("\n")
                    .append("- ventilationLevel=").append(environment.getVentilationLevel()).append("\n")
                    .append("- urbanContext=").append(environment.getUrbanContext()).append("\n")
                    .append("- notes=").append(environment.getNotes()).append("\n");
        }

        sb.append("Recent sensor readings (most recent first):\n");
        List<SensorReadingDomain> sorted = readings.stream()
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .collect(Collectors.toList());
        for (SensorReadingDomain r : sorted) {
            sb.append(String.format("- ts=%s, mq4=%s, mq7=%s, mq135=%s, state=%s\n",
                    r.getTimestamp(), r.getMq4(), r.getMq7(), r.getMq135(),
                    r.getAirQualityState()));
        }

        sb.append("\nPlease return JSON with fields: summary (string), suggestions (array of strings).\n");

        String prompt = sb.toString();

        return ollamaClientPort.generate(prompt)
                .map(responseText -> {
                    return RecommendationDomain.builder()
                            .summary(responseText)
                            .suggestions(List.of())
                            .build();
                });
    }
}
