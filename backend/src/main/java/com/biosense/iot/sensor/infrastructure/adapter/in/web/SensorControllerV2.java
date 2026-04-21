package com.biosense.iot.sensor.infrastructure.adapter.in.web;

import com.biosense.iot.sensor.infrastructure.adapter.in.web.dto.SensorReadingRequest;
import com.biosense.iot.sensor.domain.port.in.IngestSensorReadingUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/v2/sensors")
@RequiredArgsConstructor
public class SensorControllerV2 {

    private static final Logger log = LoggerFactory.getLogger(SensorControllerV2.class);

    private final IngestSensorReadingUseCase ingestSensorReadingUseCase;

    @PostMapping("/reading")
    public Mono<ResponseEntity<Object>> receiveReading(
            @RequestBody SensorReadingRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String apiKey = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            apiKey = authHeader.substring(7);
        }

        String macAddress = normalizeMac(request.getMacAddress());
        if (macAddress == null || macAddress.isBlank()) {
            return Mono.just(ResponseEntity.badRequest().body((Object) Map.of("error", "Missing macAddress/deviceId")));
        }

        String readingId = request.getReadingId();
        if (readingId == null || readingId.isBlank()) {
            long ts = request.getTimestamp() != null ? request.getTimestamp() : System.currentTimeMillis();
            readingId = macAddress + "-" + ts;
        }

        log.info("[SENSORS] Ingest request mac={} readingId={} mq7(co)={} mq4(ch4)={} mq135(airQuality)={}",
                macAddress,
                readingId,
                request.getMq7(),
                request.getMq4(),
                request.getMq135());

        return ingestSensorReadingUseCase.execute(
                macAddress,
                readingId,
                apiKey,
                request.getMq4(),
                request.getMq7(),
                request.getMq135())
                .map(reading -> ResponseEntity.ok((Object) Map.of(
                        "status", "success",
                        "id", reading.getId(),
                        "airQualityState", reading.getAirQualityState())))
                .onErrorResume(e -> {
                    log.error("[SENSORS] Ingest error mac={} reason={}", macAddress, e.getMessage());
                    if (e instanceof org.springframework.web.server.ResponseStatusException rse) {
                        return Mono.just(ResponseEntity.status(rse.getStatusCode())
                                .body((Object) Map.of("error", rse.getReason())));
                    }
                    return Mono
                            .just(ResponseEntity.internalServerError().body((Object) Map.of("error", e.getMessage())));
                });
    }

    private String normalizeMac(String mac) {
        if (mac == null) {
            return null;
        }

        String normalized = mac.trim().replace('-', ':').toUpperCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
