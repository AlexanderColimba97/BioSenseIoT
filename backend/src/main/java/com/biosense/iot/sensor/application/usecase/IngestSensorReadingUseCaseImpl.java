package com.biosense.iot.sensor.application.usecase;

import com.biosense.iot.ai.application.usecase.GenerateAiRecommendationUseCaseImpl;
import com.biosense.iot.diagnostic.domain.model.DiagnosticDomain;
import com.biosense.iot.diagnostic.domain.port.out.DiagnosticRepositoryPort;
import com.biosense.iot.pet.domain.model.EnvironmentProfileDomain;
import com.biosense.iot.pet.domain.model.PetProfileDomain;
import com.biosense.iot.pet.domain.port.out.PetContextRepositoryPort;
import com.biosense.iot.sensor.domain.model.SensorReadingDomain;
import com.biosense.iot.sensor.domain.port.in.IngestSensorReadingUseCase;
import com.biosense.iot.sensor.domain.port.out.DeviceRepositoryPort;
import com.biosense.iot.sensor.domain.port.out.SensorReadingRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class IngestSensorReadingUseCaseImpl implements IngestSensorReadingUseCase {

    private static final Logger log = LoggerFactory.getLogger(IngestSensorReadingUseCaseImpl.class);

    private final DeviceRepositoryPort deviceRepositoryPort;
    private final SensorReadingRepositoryPort sensorReadingRepositoryPort;
    private final DiagnosticRepositoryPort diagnosticRepositoryPort;
    private final PetContextRepositoryPort petContextRepositoryPort;
    private final GenerateAiRecommendationUseCaseImpl generateAiRecommendationUseCase;

    @Override
    public Mono<SensorReadingDomain> execute(String macAddress, String readingId, String apiKey, Double mq4, Double mq7,
            Double mq135) {
        if (readingId == null || readingId.isBlank()) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing readingId"));
        }

        return deviceRepositoryPort.getLinkedDeviceId(macAddress)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "Unlinked Device")))
                .flatMap(deviceId -> validateOrRegisterApiKey(macAddress, apiKey)
                        .then(Mono.defer(() -> {
                            SensorReadingDomain reading = new SensorReadingDomain(deviceId, readingId, mq4, mq7, mq135);

                            if (reading.getAirQualityState() == SensorReadingDomain.AirQualityState.DANGER) {
                                log.warn("ALERTA: Calidad del aire peligrosa detectada en dispositivo {}", macAddress);
                            }

                            return sensorReadingRepositoryPort.save(reading)
                                    .switchIfEmpty(Mono.error(
                                            new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate reading")))
                                    .flatMap(savedReading -> deviceRepositoryPort.updateLastSeenByDeviceId(deviceId)
                                            .then(generateAndSaveDiagnostic(deviceId, savedReading))
                                            .thenReturn(savedReading));
                        })));
    }

    private Mono<Void> validateOrRegisterApiKey(String macAddress, String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authorization header"));
        }

        return deviceRepositoryPort.getApiSecretByMacAddress(macAddress)
                .flatMap(storedSecret -> {
                    if (storedSecret == null) {
                        return deviceRepositoryPort.storeApiSecretByMacAddress(macAddress, apiKey);
                    }
                    if (!storedSecret.equals(apiKey)) {
                        return Mono
                                .error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid authorization"));
                    }
                    return Mono.<Void>empty();
                })
                .switchIfEmpty(Mono.defer(() -> deviceRepositoryPort.storeApiSecretByMacAddress(macAddress, apiKey)
                        .onErrorResume(e -> {
                            log.debug("Could not store api_secret for {}: {}", macAddress, e.getMessage());
                            return Mono.empty();
                        })));
    }

    private Mono<Void> generateAndSaveDiagnostic(Integer deviceId, SensorReadingDomain reading) {
        return deviceRepositoryPort.getUserIdsByDeviceId(deviceId)
                .flatMap(userId -> {
                    Mono<PetProfileDomain> petMono = petContextRepositoryPort.findPrimaryPetByUserId(userId)
                            .defaultIfEmpty(PetProfileDomain.defaultProfile());
                    Mono<EnvironmentProfileDomain> envMono = petContextRepositoryPort
                            .getEnvironmentProfileByUserId(userId)
                            .defaultIfEmpty(EnvironmentProfileDomain.defaultProfile());

                    return Mono.zip(petMono, envMono)
                            .flatMap(tuple -> {
                                PetProfileDomain pet = tuple.getT1();
                                EnvironmentProfileDomain environment = tuple.getT2();
                                DiagnosticInfo info = buildDiagnosticInfo(reading, pet, environment);

                                DiagnosticDomain diagnosticDomain = DiagnosticDomain.builder()
                                        .diagnosticText(info.text)
                                        .severity(info.severity)
                                        .riskLevel(info.riskLevel)
                                        .confidence(info.confidence)
                                        .affectedPet(info.affectedPet)
                                        .environmentContext(info.environmentContext)
                                        .recommendation(info.recommendation)
                                        .mq4(reading.getMq4())
                                        .mq7(reading.getMq7())
                                        .mq135(reading.getMq135())
                                        .build();

                                return diagnosticRepositoryPort.save(
                                        userId,
                                        reading.getId(),
                                        info.severity,
                                        info.riskLevel,
                                        info.confidence,
                                        info.affectedPet,
                                        info.environmentContext,
                                        info.text,
                                        info.recommendation)
                                        .doOnSuccess(v -> triggerAiRecommendationAsync(
                                                userId,
                                                reading,
                                                pet,
                                                info,
                                                diagnosticDomain,
                                                environment))
                                        .then();
                            });
                })
                .then()
                .onErrorResume(e -> {
                    log.error("Error saving diagnostic for device {}: {}", deviceId, e.getMessage());
                    return Mono.empty();
                });
    }

    private void triggerAiRecommendationAsync(
            Integer userId,
            SensorReadingDomain reading,
            PetProfileDomain pet,
            DiagnosticInfo info,
            DiagnosticDomain diagnosticDomain,
            EnvironmentProfileDomain environment) {

        if (!"DANGER".equals(info.riskLevel)) {
            return;
        }

        diagnosticRepositoryPort.findLatestDiagnosticIdByUserAndReading(userId, reading.getId())
                .flatMap(diagnosticId -> generateAiRecommendationUseCase.generateIfDanger(
                        userId,
                        diagnosticId,
                        reading.getId(),
                        pet.getId(),
                        info.riskLevel,
                        diagnosticDomain,
                        reading,
                        pet,
                        environment))
                .onErrorResume(aiError -> {
                    log.warn("No se pudo generar recomendacion IA, se mantiene flujo principal: {}",
                            aiError.getMessage());
                    return Mono.empty();
                })
                .subscribe();
    }

    private DiagnosticInfo buildDiagnosticInfo(SensorReadingDomain reading, PetProfileDomain pet,
            EnvironmentProfileDomain environment) {
        SensorReadingDomain.AirQualityState state = reading.getAirQualityState();
        double mq7 = reading.getMq7();
        double mq135 = reading.getMq135();
        double mq4 = reading.getMq4();
        double sensitivity = getSensitivityMultiplier(pet);
        double environmentRisk = getEnvironmentMultiplier(environment);
        double riskScore = Math.min(100.0,
                (mq7 * 0.9 + mq4 * 0.25 + mq135 * 0.35) * sensitivity * environmentRisk / 4.0);

        String riskLevel = riskScore >= 70 ? "DANGER" : riskScore >= 35 ? "WARNING" : "SAFE";
        String petSummary = pet.getSpecies() + " - " + pet.getBreed();
        String envSummary = environment.getSpaceType() + " - ventilacion " + environment.getVentilationLevel();

        StringBuilder recommendationBuilder = new StringBuilder();
        recommendationBuilder.append("1. Ventilar inmediatamente el espacio.\n")
                .append("2. Evitar que la mascota permanezca cerca del suelo en zonas cerradas.\n")
                .append("3. Revisar fuentes de gas y combustion.\n");

        if (mq7 > 50 || riskLevel.equals("DANGER")) {
            recommendationBuilder.append("4. Si persiste > 10 minutos, evacuar temporalmente y evaluar sintomas.");
        } else {
            recommendationBuilder.append("4. Mantener monitoreo continuo durante los proximos 15 minutos.");
        }

        String personalizedContext = "Evaluacion para mascota registrada (" + petSummary + "): " +
                "sensibilidad " + pet.getSensitivityLevel() + ", riesgo respiratorio " + pet.getRespiratoryRisk() +
                ". Entorno: " + envSummary + ".";

        if (state == SensorReadingDomain.AirQualityState.DANGER) {
            if (mq7 > 400 || mq135 > 800) {
                return new DiagnosticInfo(
                        "CRITICAL",
                        riskLevel,
                        confidenceFor(riskScore, state),
                        petSummary,
                        envSummary,
                        "Niveles criticos detectados. CO: " + String.format("%.1f", mq7) +
                                " ppm, Aire: " + String.format("%.1f", mq135) + " ppm. Evacue el area inmediatamente. "
                                +
                                personalizedContext,
                        "Salga del area y llame a servicios de emergencia. No encienda aparatos electricos.\n"
                                + recommendationBuilder);
            }
            return new DiagnosticInfo(
                    "HIGH",
                    riskLevel,
                    confidenceFor(riskScore, state),
                    petSummary,
                    envSummary,
                    "Calidad del aire peligrosa. CO: " + String.format("%.1f", mq7) +
                            " ppm, Aire: " + String.format("%.1f", mq135) + " ppm. " + personalizedContext,
                    recommendationBuilder.toString());
        }

        if (state == SensorReadingDomain.AirQualityState.WARNING) {
            String gasInfo = mq4 > 200
                    ? "Metano detectado: " + String.format("%.1f", mq4) + " ppm. "
                    : "";
            return new DiagnosticInfo(
                    "MEDIUM",
                    riskLevel,
                    confidenceFor(riskScore, state),
                    petSummary,
                    envSummary,
                    gasInfo + "Niveles moderados de gases. CO: " + String.format("%.1f", mq7) +
                            " ppm, Aire: " + String.format("%.1f", mq135) + " ppm. " + personalizedContext,
                    recommendationBuilder.toString());
        }

        return new DiagnosticInfo(
                "LOW",
                riskLevel,
                confidenceFor(riskScore, state),
                petSummary,
                envSummary,
                "Calidad del aire aceptable. CO: " + String.format("%.1f", mq7) +
                        " ppm, Aire: " + String.format("%.1f", mq135) + " ppm. " + personalizedContext,
                "Continue con habitos de ventilacion regulares. Monitoreo recomendado por 15 minutos.");
    }

    private double getSensitivityMultiplier(PetProfileDomain pet) {
        double speciesFactor = switch (safeUpper(pet.getSpecies())) {
            case "BIRD" -> 1.35;
            case "CAT" -> 1.15;
            case "DOG" -> 1.20;
            default -> 1.0;
        };

        double sensitivityFactor = switch (safeUpper(pet.getSensitivityLevel())) {
            case "HIGH" -> 1.25;
            case "LOW" -> 0.9;
            default -> 1.0;
        };

        double respiratoryFactor = switch (safeUpper(pet.getRespiratoryRisk())) {
            case "HIGH" -> 1.25;
            case "MODERATE" -> 1.10;
            default -> 1.0;
        };

        return speciesFactor * sensitivityFactor * respiratoryFactor;
    }

    private double getEnvironmentMultiplier(EnvironmentProfileDomain environment) {
        double ventilationFactor = switch (safeUpper(environment.getVentilationLevel())) {
            case "LOW" -> 1.25;
            case "HIGH" -> 0.9;
            default -> 1.0;
        };
        double areaFactor = "INDOOR".equals(safeUpper(environment.getAreaType())) ? 1.1 : 0.95;
        return ventilationFactor * areaFactor;
    }

    private double confidenceFor(double riskScore, SensorReadingDomain.AirQualityState state) {
        double stateBonus = switch (state) {
            case DANGER -> 0.18;
            case WARNING -> 0.1;
            default -> 0.05;
        };
        return Math.min(0.99, 0.7 + Math.min(riskScore / 250.0, 0.2) + stateBonus);
    }

    private String safeUpper(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private record DiagnosticInfo(String severity, String riskLevel, Double confidence, String affectedPet,
            String environmentContext, String text, String recommendation) {
    }
}
