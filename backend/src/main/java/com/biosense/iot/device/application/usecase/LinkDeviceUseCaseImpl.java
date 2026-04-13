package com.biosense.iot.device.application.usecase;

import com.biosense.iot.device.domain.model.DeviceDomain;
import com.biosense.iot.device.domain.port.in.LinkDeviceUseCase;
import com.biosense.iot.device.domain.port.out.DeviceRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class LinkDeviceUseCaseImpl implements LinkDeviceUseCase {

    private final DeviceRepositoryPort deviceRepositoryPort;

    @Override
    public Mono<DeviceDomain> execute(String userEmail) {
        return deviceRepositoryPort.findUserIdByEmail(userEmail)
                .flatMap(userId -> deviceRepositoryPort.findLastActiveMacAddress()
                        .flatMap(mac -> deviceRepositoryPort.linkDeviceToUser(mac, userId)));
    }

    @Override
    public Mono<DeviceDomain> activateDevice(String userEmail) {
        return deviceRepositoryPort.findByUserEmail(userEmail)
                .switchIfEmpty(Mono.error(
                        new RuntimeException("No tienes un dispositivo vinculado. Vincúlalo primero desde el perfil.")))
                .doOnNext(device -> {
                    // Aquí se podría enviar un comando al ESP32 para que comience a enviar datos
                    // Por ahora solo marcamos que está activado
                    System.out
                            .println("ESP32 activado para usuario: " + userEmail + ", MAC: " + device.getMacAddress());
                });
    }
}
