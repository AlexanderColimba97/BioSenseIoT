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
public class EnvironmentProfileDomain {
    private Integer id;
    private Integer userId;
    private String profileName;
    private String spaceType;
    private String areaType;
    private String ventilationLevel;
    private String urbanContext;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;

    public static EnvironmentProfileDomain defaultProfile() {
        return EnvironmentProfileDomain.builder()
                .profileName("Principal")
                .spaceType("APARTMENT")
                .areaType("INDOOR")
                .ventilationLevel("MEDIUM")
                .urbanContext("URBAN")
                .build();
    }
}
