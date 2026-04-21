package com.biosense.iot.sensor.application.usecase;

import com.biosense.iot.diagnostic.domain.port.out.DiagnosticRepositoryPort;
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
                                log.warn("¡ALERTA! Calidad del aire peligrosa detectada en dispositivo {}", macAddress);
                            }

                            return sensorReadingRepositoryPort.save(reading)
                                    .switchIfEmpty(Mono.error(
                                            new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate reading")))
                                    .flatMap(savedReading -> generateAndSaveDiagnostic(deviceId, savedReading)
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
                    DiagnosticInfo info = buildDiagnosticInfo(reading);
                    return diagnosticRepositoryPort.save(userId, reading.getId(), info.severity, info.text,
                            info.recommendation);
                })
                .then()
                .onErrorResume(e -> {
                    log.error("Error saving diagnostic for device {}: {}", deviceId, e.getMessage());
                    return Mono.empty();
                });
    }

    private DiagnosticInfo buildDiagnosticInfo(SensorReadingDomain reading) {
        SensorReadingDomain.AirQualityState state = reading.getAirQualityState();
        double mq7 = reading.getMq7();
        double mq135 = reading.getMq135();
        double mq4 = reading.getMq4();

        if (state == SensorReadingDomain.AirQualityState.DANGER) {
            if (mq7 > 400 || mq135 > 800) {
                return new DiagnosticInfo(
                        "CRITICAL",
                        "Niveles críticos detectados. CO: " + String.format("%.1f", mq7) +
                                " ppm, Aire: " + String.format("%.1f", mq135) + " ppm. Evacúe el área inmediatamente.",
                        "Salga del área y llame a servicios de emergencia. No encienda aparatos eléctricos.");
            }
            return new DiagnosticInfo(
                    "HIGH",
                    "Calidad del aire peligrosa. CO: " + String.format("%.1f", mq7) +
                            " ppm, Aire: " + String.format("%.1f", mq135) + " ppm.",
                    "Abra ventanas y puertas inmediatamente. Apague fuentes de combustión cercanas.");
        }

        if (state == SensorReadingDomain.AirQualityState.WARNING) {
            String gasInfo = mq4 > 200
                    ? "Metano detectado: " + String.format("%.1f", mq4) + " ppm. "
                    : "";
            return new DiagnosticInfo(
                    "MEDIUM",
                    gasInfo + "Niveles moderados de gases. CO: " + String.format("%.1f", mq7) +
                            " ppm, Aire: " + String.format("%.1f", mq135) + " ppm.",
                    "Mejore la ventilación. Verifique fuentes de gas si el metano es elevado.");
        }

        return new DiagnosticInfo(
                "LOW",
                "Calidad del aire aceptable. CO: " + String.format("%.1f", mq7) +
                        " ppm, Aire: " + String.format("%.1f", mq135) + " ppm.",
                "Continúe con hábitos de ventilación regulares. Sensores calibrados correctamente.");
    }

    private record DiagnosticInfo(String severity, String text, String recommendation) {
    }
}
