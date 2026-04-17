package com.biosense.iot.device.infrastructure.adapter.in.web;

import com.biosense.iot.device.domain.port.in.LinkDeviceUseCase;
import com.biosense.iot.device.domain.port.in.GetUserDevicesUseCase;
import com.biosense.iot.device.infrastructure.adapter.in.web.dto.LinkDeviceRequest;
import com.biosense.iot.device.infrastructure.adapter.in.web.dto.DeviceResponseDto;
import com.biosense.iot.sensor.domain.port.in.GetDeviceReadingsUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/v2/devices")
@RequiredArgsConstructor
public class DeviceControllerV2 {

        private final LinkDeviceUseCase linkDeviceUseCase;
        private final GetUserDevicesUseCase getUserDevicesUseCase;
        private final GetDeviceReadingsUseCase getDeviceReadingsUseCase;

    @PostMapping("/link")
    public Mono<ResponseEntity<com.biosense.iot.device.infrastructure.adapter.in.web.dto.LinkDeviceResponse>> linkDevice(
            @RequestBody LinkDeviceRequest request,
            Authentication authentication) {

        String userEmail = authentication.getName();

        return linkDeviceUseCase.execute(userEmail, request.getMacAddress(), request.getDeviceName())
                .map(device -> ResponseEntity.ok(
                        com.biosense.iot.device.infrastructure.adapter.in.web.dto.LinkDeviceResponse.builder()
                        .status("success")
                        .deviceId(device.getId())
                        .macAddress(device.getMacAddress())
                        .name(device.getName())
                        .apiSecret(device.getApiSecret())
                        .build()
                ))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(
                        com.biosense.iot.device.infrastructure.adapter.in.web.dto.LinkDeviceResponse.builder()
                        .status("error: " + e.getMessage())
                        .build()
                )));
    }

    @GetMapping("/my-devices")
    public Flux<DeviceResponseDto> getMyDevices(Authentication authentication) {
        String userEmail = authentication.getName();
        return getUserDevicesUseCase.execute(userEmail)
                .map(device -> DeviceResponseDto.builder()
                        .id(device.getId())
                        .name(device.getName())
                        .macAddress(device.getMacAddress())
                        .build());
    }

    @GetMapping("/{deviceId}/readings")
    public Flux<com.biosense.iot.device.infrastructure.adapter.in.web.dto.SensorReadingResponseDto> getDeviceReadings(
            @PathVariable Integer deviceId,
            @RequestParam(defaultValue = "100") Integer limit,
            Authentication authentication) {

        String userEmail = authentication.getName();

        return getDeviceReadingsUseCase.execute(userEmail, deviceId, limit)
                .map(reading -> com.biosense.iot.device.infrastructure.adapter.in.web.dto.SensorReadingResponseDto.builder()
                        .id((long) reading.getId())
                        .mq4(reading.getMq4())
                        .mq7(reading.getMq7())
                        .mq135(reading.getMq135())
                        .timestamp(reading.getTimestamp())
                        .airQualityState(reading.getAirQualityState() != null ? reading.getAirQualityState().name() : null)
                        .build());
    }

    @DeleteMapping("/{deviceId}")
    public Mono<ResponseEntity<com.biosense.iot.device.infrastructure.adapter.in.web.dto.LinkDeviceResponse>> unlinkDevice(
            @PathVariable Integer deviceId,
            Authentication authentication) {

        String userEmail = authentication.getName();

        return linkDeviceUseCase.unlink(userEmail, deviceId)
                .map(v -> ResponseEntity.ok(com.biosense.iot.device.infrastructure.adapter.in.web.dto.LinkDeviceResponse.builder().status("success").build()))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(
                        com.biosense.iot.device.infrastructure.adapter.in.web.dto.LinkDeviceResponse.builder().status("error: " + e.getMessage()).build()
                )));
    }
}