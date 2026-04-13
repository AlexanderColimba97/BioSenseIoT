package com.biosense.iot.device.infrastructure.adapter.in.web;

import com.biosense.iot.device.domain.port.out.DeviceRepositoryPort;
import com.biosense.iot.auth.infrastructure.security.jwt.JwtAdapter;
import com.biosense.iot.device.domain.port.in.LinkDeviceUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/v2/devices")
@RequiredArgsConstructor
public class DeviceControllerV2 {

    private final LinkDeviceUseCase linkDeviceUseCase;
    private final JwtAdapter jwtAdapter;
    private final DeviceRepositoryPort deviceRepositoryPort;

    @PostMapping("/link-auto")
    public Mono<ResponseEntity<Object>> linkDeviceAuto(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String email = jwtAdapter.extractUsername(token);

        return linkDeviceUseCase.execute(email)
                .map(device -> ResponseEntity.ok((Object) Map.of(
                        "status", "success",
                        "message", "Dispositivo sincronizado con éxito",
                        "mac", device.getMacAddress())))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @GetMapping("/debug/last-mac")
    public Mono<ResponseEntity<Object>> getLastMac() {
        return deviceRepositoryPort.findLastActiveMacAddress()
                .map(mac -> ResponseEntity.ok((Object) Map.of("mac", mac)))
                .defaultIfEmpty(
                        ResponseEntity.ok(Map.of("mac", null, "message", "No se encontraron lecturas de sensores")));
    }

    @PostMapping("/activate")
    public Mono<ResponseEntity<Object>> activateDevice(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String email = jwtAdapter.extractUsername(token);

        return linkDeviceUseCase.activateDevice(email)
                .map(device -> ResponseEntity.ok((Object) Map.of(
                        "status", "success",
                        "message", "ESP32 activado. Comenzará a enviar datos de sensores MQ4, MQ7 y MQ135.",
                        "device", device.getMacAddress(),
                        "activated", true)))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }
}
