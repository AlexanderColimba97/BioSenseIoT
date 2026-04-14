package com.biosense.iot.device.infrastructure.adapter.in.web;

import com.biosense.iot.device.domain.port.in.LinkDeviceUseCase;
import com.biosense.iot.device.domain.port.in.GetUserDevicesUseCase;
import com.biosense.iot.dto.LinkDeviceRequest;
import com.biosense.iot.dto.DeviceResponseDto;
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
        public Mono<ResponseEntity<Map<String, Object>>> linkDevice(
                        @RequestBody LinkDeviceRequest request,
                        Authentication authentication) {

                String userEmail = authentication.getName();

                return linkDeviceUseCase.execute(userEmail, request.getMacAddress(), request.getDeviceName())
                                .map(device -> ResponseEntity.ok(Map.<String, Object>of(
                                                "status", "success",
                                                "deviceId", device.getId(),
                                                "macAddress", device.getMacAddress(),
                                                "name", device.getName())))
                                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.<String, Object>of(
                                                "error", e.getMessage()))));
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
        public Flux<Map<String, Object>> getDeviceReadings(
                        @PathVariable Integer deviceId,
                        @RequestParam(defaultValue = "100") Integer limit,
                        Authentication authentication) {

                String userEmail = authentication.getName();

                return getDeviceReadingsUseCase.execute(userEmail, deviceId, limit)
                                .map(reading -> Map.<String, Object>of(
                                                "id", reading.getId(),
                                                "mq4", reading.getMq4(),
                                                "mq7", reading.getMq7(),
                                                "mq135", reading.getMq135(),
                                                "timestamp", reading.getTimestamp(),
                                                "airQualityState", reading.getAirQualityState()));
        }

        @DeleteMapping("/{deviceId}")
        public Mono<ResponseEntity<Map<String, Object>>> unlinkDevice(
                        @PathVariable Integer deviceId,
                        Authentication authentication) {

                String userEmail = authentication.getName();

                return linkDeviceUseCase.unlink(userEmail, deviceId)
                                .map(v -> ResponseEntity.ok(Map.<String, Object>of("status", "success")))
                                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.<String, Object>of(
                                                "error", e.getMessage()))));
        }
}