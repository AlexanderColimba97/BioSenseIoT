package com.biosense.iot.pet.application.usecase;

import com.biosense.iot.device.domain.port.out.UserRepositoryPort;
import com.biosense.iot.pet.domain.model.EnvironmentProfileDomain;
import com.biosense.iot.pet.domain.model.PetProfileDomain;
import com.biosense.iot.pet.domain.model.UserContextProfileDomain;
import com.biosense.iot.pet.domain.port.out.PetContextRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class ManageProfileContextUseCase {

    private final UserRepositoryPort userRepositoryPort;
    private final PetContextRepositoryPort petContextRepositoryPort;

    public Mono<UserContextProfileDomain> getContext(String userEmail) {
        return userRepositoryPort.getUserIdByEmail(userEmail)
                .flatMap(userId -> Mono.zip(
                        petContextRepositoryPort.getPetsByUserId(userId).collectList(),
                        petContextRepositoryPort.getEnvironmentProfileByUserId(userId)
                                .defaultIfEmpty(EnvironmentProfileDomain.defaultProfile())
                ).map(tuple -> UserContextProfileDomain.builder()
                        .email(userEmail)
                        .pets(tuple.getT1())
                        .environment(tuple.getT2())
                        .build()));
    }

    public Mono<PetProfileDomain> upsertPet(String userEmail, PetProfileDomain pet) {
        return userRepositoryPort.getUserIdByEmail(userEmail)
                .flatMap(userId -> petContextRepositoryPort.savePet(userId, pet));
    }

    public Mono<Void> deletePet(String userEmail, Integer petId) {
        return userRepositoryPort.getUserIdByEmail(userEmail)
                .flatMap(userId -> petContextRepositoryPort.deletePet(userId, petId));
    }

    public Mono<EnvironmentProfileDomain> upsertEnvironment(String userEmail, EnvironmentProfileDomain environment) {
        return userRepositoryPort.getUserIdByEmail(userEmail)
                .flatMap(userId -> petContextRepositoryPort.saveEnvironmentProfile(userId, environment));
    }
}
