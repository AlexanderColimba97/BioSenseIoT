package com.biosense.iot.pet.domain.port.out;

import com.biosense.iot.pet.domain.model.EnvironmentProfileDomain;
import com.biosense.iot.pet.domain.model.PetProfileDomain;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface PetContextRepositoryPort {
    Flux<PetProfileDomain> getPetsByUserId(Integer userId);

    Mono<PetProfileDomain> savePet(Integer userId, PetProfileDomain pet);

    Mono<Void> deletePet(Integer userId, Integer petId);

    Mono<EnvironmentProfileDomain> getEnvironmentProfileByUserId(Integer userId);

    Mono<EnvironmentProfileDomain> saveEnvironmentProfile(Integer userId, EnvironmentProfileDomain environment);

    Mono<PetProfileDomain> findPrimaryPetByUserId(Integer userId);
}
