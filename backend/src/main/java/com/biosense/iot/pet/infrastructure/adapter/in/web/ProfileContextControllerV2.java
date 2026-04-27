package com.biosense.iot.pet.infrastructure.adapter.in.web;

import com.biosense.iot.pet.application.usecase.ManageProfileContextUseCase;
import com.biosense.iot.pet.domain.model.EnvironmentProfileDomain;
import com.biosense.iot.pet.domain.model.PetProfileDomain;
import com.biosense.iot.pet.domain.model.UserContextProfileDomain;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v2/profile")
@RequiredArgsConstructor
public class ProfileContextControllerV2 {

    private final ManageProfileContextUseCase manageProfileContextUseCase;

    @GetMapping("/context")
    public Mono<UserContextProfileDomain> getProfileContext(Authentication authentication) {
        return manageProfileContextUseCase.getContext(authentication.getName());
    }

    @PostMapping("/pets")
    public Mono<PetProfileDomain> savePet(@RequestBody PetRequest request, Authentication authentication) {
        PetProfileDomain pet = PetProfileDomain.builder()
                .id(request.id)
                .name(request.name)
                .species(request.species)
                .breed(request.breed)
                .ageYears(request.ageYears)
                .weightKg(request.weightKg)
                .sensitivityLevel(request.sensitivityLevel)
                .respiratoryRisk(request.respiratoryRisk)
                .activityLevel(request.activityLevel)
                .vulnerabilities(request.vulnerabilities)
                .build();

        return manageProfileContextUseCase.upsertPet(authentication.getName(), pet);
    }

    @DeleteMapping("/pets/{petId}")
    public Mono<ResponseEntity<Void>> deletePet(@PathVariable Integer petId, Authentication authentication) {
        return manageProfileContextUseCase.deletePet(authentication.getName(), petId)
                .thenReturn(ResponseEntity.noContent().build());
    }

    @PutMapping("/environment")
    public Mono<EnvironmentProfileDomain> saveEnvironment(@RequestBody EnvironmentRequest request,
                                                          Authentication authentication) {
        EnvironmentProfileDomain environment = EnvironmentProfileDomain.builder()
                .id(request.id)
                .profileName(request.profileName)
                .spaceType(request.spaceType)
                .areaType(request.areaType)
                .ventilationLevel(request.ventilationLevel)
                .urbanContext(request.urbanContext)
                .notes(request.notes)
                .build();

        return manageProfileContextUseCase.upsertEnvironment(authentication.getName(), environment);
    }

    private record PetRequest(
            Integer id,
            String name,
            String species,
            String breed,
            Integer ageYears,
            Double weightKg,
            String sensitivityLevel,
            String respiratoryRisk,
            String activityLevel,
            String vulnerabilities
    ) {
    }

    private record EnvironmentRequest(
            Integer id,
            String profileName,
            String spaceType,
            String areaType,
            String ventilationLevel,
            String urbanContext,
            String notes
    ) {
    }
}
