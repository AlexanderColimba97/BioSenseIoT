package com.biosense.iot.pet.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PetProfileDomain {
    private Integer id;
    private Integer userId;
    private String name;
    private String species;
    private String breed;
    private Integer ageYears;
    private Double weightKg;
    private String sensitivityLevel;
    private String respiratoryRisk;
    private String activityLevel;
    private String healthRiskLevel;
    private String vulnerabilities;
    private Instant createdAt;
    private Instant updatedAt;

    public static PetProfileDomain defaultProfile() {
        return PetProfileDomain.builder()
                .name("Mascota")
                .species("DOG")
                .breed("MIX")
                .sensitivityLevel("MEDIUM")
                .respiratoryRisk("NORMAL")
                .activityLevel("MEDIUM")
                .build();
    }
}
