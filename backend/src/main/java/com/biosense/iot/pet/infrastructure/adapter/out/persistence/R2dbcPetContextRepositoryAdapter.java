package com.biosense.iot.pet.infrastructure.adapter.out.persistence;

import com.biosense.iot.pet.domain.model.EnvironmentProfileDomain;
import com.biosense.iot.pet.domain.model.PetProfileDomain;
import com.biosense.iot.pet.domain.port.out.PetContextRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class R2dbcPetContextRepositoryAdapter implements PetContextRepositoryPort {

    private final DatabaseClient databaseClient;

    @Override
    public Flux<PetProfileDomain> getPetsByUserId(Integer userId) {
        return databaseClient.sql("SELECT id, user_id, name, species, breed, age_years, weight_kg, sensitivity_level, respiratory_risk, activity_level, health_risk_level, vulnerabilities, created_at, updated_at " +
                        "FROM pets WHERE user_id = :userId ORDER BY created_at DESC")
                .bind("userId", userId)
                .map((row, metadata) -> PetProfileDomain.builder()
                        .id(row.get("id", Integer.class))
                        .userId(row.get("user_id", Integer.class))
                        .name(row.get("name", String.class))
                        .species(row.get("species", String.class))
                        .breed(row.get("breed", String.class))
                        .ageYears(row.get("age_years", Integer.class))
                        .weightKg(row.get("weight_kg", Double.class))
                        .sensitivityLevel(row.get("sensitivity_level", String.class))
                        .respiratoryRisk(row.get("respiratory_risk", String.class))
                        .activityLevel(row.get("activity_level", String.class))
                        .healthRiskLevel(row.get("health_risk_level", String.class))
                        .vulnerabilities(row.get("vulnerabilities", String.class))
                        .createdAt(row.get("created_at", Instant.class))
                        .updatedAt(row.get("updated_at", Instant.class))
                        .build())
                .all();
    }

    @Override
    public Mono<PetProfileDomain> savePet(Integer userId, PetProfileDomain pet) {
        if (pet.getId() != null) {
            return updatePet(userId, pet);
        }
        return insertPet(userId, pet);
    }

    private Mono<PetProfileDomain> insertPet(Integer userId, PetProfileDomain pet) {
        return databaseClient.sql("INSERT INTO pets (user_id, name, species, breed, age_years, weight_kg, sensitivity_level, respiratory_risk, activity_level, health_risk_level, vulnerabilities, updated_at) " +
                        "VALUES (:userId, :name, :species, :breed, :ageYears, :weightKg, :sensitivityLevel, :respiratoryRisk, :activityLevel, :healthRiskLevel, :vulnerabilities, NOW()) " +
                        "RETURNING id, user_id, name, species, breed, age_years, weight_kg, sensitivity_level, respiratory_risk, activity_level, health_risk_level, vulnerabilities, created_at, updated_at")
                .bind("userId", userId)
                .bind("name", safeName(pet.getName()))
                .bind("species", normalizeOrDefault(pet.getSpecies(), "DOG"))
                .bind("breed", normalizeOrDefault(pet.getBreed(), "MIX"))
                .bind("ageYears", pet.getAgeYears())
                .bind("weightKg", pet.getWeightKg())
                .bind("sensitivityLevel", normalizeOrDefault(pet.getSensitivityLevel(), "MEDIUM"))
                .bind("respiratoryRisk", normalizeOrDefault(pet.getRespiratoryRisk(), "NORMAL"))
                .bind("activityLevel", normalizeOrDefault(pet.getActivityLevel(), "MEDIUM"))
                .bind("healthRiskLevel", normalizeOrDefault(pet.getHealthRiskLevel(), "MEDIUM"))
                .bind("vulnerabilities", pet.getVulnerabilities())
                .map((row, metadata) -> mapPet(row))
                .first();
    }

    private Mono<PetProfileDomain> updatePet(Integer userId, PetProfileDomain pet) {
        return databaseClient.sql("UPDATE pets SET name = :name, species = :species, breed = :breed, age_years = :ageYears, weight_kg = :weightKg, " +
                        "sensitivity_level = :sensitivityLevel, respiratory_risk = :respiratoryRisk, activity_level = :activityLevel, health_risk_level = :healthRiskLevel, vulnerabilities = :vulnerabilities, updated_at = NOW() " +
                        "WHERE id = :petId AND user_id = :userId")
                .bind("name", safeName(pet.getName()))
                .bind("species", normalizeOrDefault(pet.getSpecies(), "DOG"))
                .bind("breed", normalizeOrDefault(pet.getBreed(), "MIX"))
                .bind("ageYears", pet.getAgeYears())
                .bind("weightKg", pet.getWeightKg())
                .bind("sensitivityLevel", normalizeOrDefault(pet.getSensitivityLevel(), "MEDIUM"))
                .bind("respiratoryRisk", normalizeOrDefault(pet.getRespiratoryRisk(), "NORMAL"))
                .bind("activityLevel", normalizeOrDefault(pet.getActivityLevel(), "MEDIUM"))
                .bind("healthRiskLevel", normalizeOrDefault(pet.getHealthRiskLevel(), "MEDIUM"))
                .bind("vulnerabilities", pet.getVulnerabilities())
                .bind("petId", pet.getId())
                .bind("userId", userId)
                .fetch()
                .rowsUpdated()
                .flatMap(rows -> {
                    if (rows == 0) {
                        return Mono.error(new IllegalArgumentException("Mascota no encontrada para actualizar"));
                    }
                    return databaseClient.sql("SELECT id, user_id, name, species, breed, age_years, weight_kg, sensitivity_level, respiratory_risk, activity_level, health_risk_level, vulnerabilities, created_at, updated_at " +
                                    "FROM pets WHERE id = :petId AND user_id = :userId")
                            .bind("petId", pet.getId())
                            .bind("userId", userId)
                            .map((row, metadata) -> mapPet(row))
                            .first();
                });
    }

    @Override
    public Mono<Void> deletePet(Integer userId, Integer petId) {
        return databaseClient.sql("DELETE FROM pets WHERE id = :petId AND user_id = :userId")
                .bind("petId", petId)
                .bind("userId", userId)
                .then();
    }

    @Override
    public Mono<EnvironmentProfileDomain> getEnvironmentProfileByUserId(Integer userId) {
        return databaseClient.sql("SELECT id, user_id, profile_name, space_type, area_type, ventilation_level, urban_context, notes, created_at, updated_at " +
                        "FROM environment_profiles WHERE user_id = :userId ORDER BY updated_at DESC LIMIT 1")
                .bind("userId", userId)
                .map((row, metadata) -> mapEnvironment(row))
                .first();
    }

    @Override
    public Mono<EnvironmentProfileDomain> saveEnvironmentProfile(Integer userId, EnvironmentProfileDomain environment) {
        return getEnvironmentProfileByUserId(userId)
                .flatMap(existing -> databaseClient.sql("UPDATE environment_profiles SET profile_name = :profileName, space_type = :spaceType, area_type = :areaType, ventilation_level = :ventilationLevel, urban_context = :urbanContext, notes = :notes, updated_at = NOW() " +
                                "WHERE id = :id RETURNING id, user_id, profile_name, space_type, area_type, ventilation_level, urban_context, notes, created_at, updated_at")
                        .bind("profileName", normalizeOrDefault(environment.getProfileName(), "Principal"))
                        .bind("spaceType", normalizeOrDefault(environment.getSpaceType(), "APARTMENT"))
                        .bind("areaType", normalizeOrDefault(environment.getAreaType(), "INDOOR"))
                        .bind("ventilationLevel", normalizeOrDefault(environment.getVentilationLevel(), "MEDIUM"))
                        .bind("urbanContext", normalizeOrDefault(environment.getUrbanContext(), "URBAN"))
                        .bind("notes", environment.getNotes())
                        .bind("id", existing.getId())
                        .map((row, metadata) -> mapEnvironment(row))
                        .first())
                .switchIfEmpty(databaseClient.sql("INSERT INTO environment_profiles (user_id, profile_name, space_type, area_type, ventilation_level, urban_context, notes, updated_at) " +
                                "VALUES (:userId, :profileName, :spaceType, :areaType, :ventilationLevel, :urbanContext, :notes, NOW()) " +
                                "RETURNING id, user_id, profile_name, space_type, area_type, ventilation_level, urban_context, notes, created_at, updated_at")
                        .bind("userId", userId)
                        .bind("profileName", normalizeOrDefault(environment.getProfileName(), "Principal"))
                        .bind("spaceType", normalizeOrDefault(environment.getSpaceType(), "APARTMENT"))
                        .bind("areaType", normalizeOrDefault(environment.getAreaType(), "INDOOR"))
                        .bind("ventilationLevel", normalizeOrDefault(environment.getVentilationLevel(), "MEDIUM"))
                        .bind("urbanContext", normalizeOrDefault(environment.getUrbanContext(), "URBAN"))
                        .bind("notes", environment.getNotes())
                        .map((row, metadata) -> mapEnvironment(row))
                        .first());
    }

    @Override
    public Mono<PetProfileDomain> findPrimaryPetByUserId(Integer userId) {
        return databaseClient.sql("SELECT id, user_id, name, species, breed, age_years, weight_kg, sensitivity_level, respiratory_risk, activity_level, health_risk_level, vulnerabilities, created_at, updated_at " +
                        "FROM pets WHERE user_id = :userId ORDER BY created_at ASC LIMIT 1")
                .bind("userId", userId)
                .map((row, metadata) -> mapPet(row))
                .first();
    }

    private PetProfileDomain mapPet(io.r2dbc.spi.Row row) {
        return PetProfileDomain.builder()
                .id(row.get("id", Integer.class))
                .userId(row.get("user_id", Integer.class))
                .name(row.get("name", String.class))
                .species(row.get("species", String.class))
                .breed(row.get("breed", String.class))
                .ageYears(row.get("age_years", Integer.class))
                .weightKg(row.get("weight_kg", Double.class))
                .sensitivityLevel(row.get("sensitivity_level", String.class))
                .respiratoryRisk(row.get("respiratory_risk", String.class))
                .activityLevel(row.get("activity_level", String.class))
                .healthRiskLevel(row.get("health_risk_level", String.class))
                .vulnerabilities(row.get("vulnerabilities", String.class))
                .createdAt(row.get("created_at", Instant.class))
                .updatedAt(row.get("updated_at", Instant.class))
                .build();
    }

    private EnvironmentProfileDomain mapEnvironment(io.r2dbc.spi.Row row) {
        return EnvironmentProfileDomain.builder()
                .id(row.get("id", Integer.class))
                .userId(row.get("user_id", Integer.class))
                .profileName(row.get("profile_name", String.class))
                .spaceType(row.get("space_type", String.class))
                .areaType(row.get("area_type", String.class))
                .ventilationLevel(row.get("ventilation_level", String.class))
                .urbanContext(row.get("urban_context", String.class))
                .notes(row.get("notes", String.class))
                .createdAt(row.get("created_at", Instant.class))
                .updatedAt(row.get("updated_at", Instant.class))
                .build();
    }

    private String safeName(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre de la mascota es requerido");
        }
        String normalized = raw.trim();
        if (normalized.length() > 100) {
            throw new IllegalArgumentException("Nombre de mascota demasiado largo (max 100)");
        }
        return normalized;
    }

    private String normalizeOrDefault(String raw, String fallback) {
        if (raw == null || raw.trim().isEmpty()) {
            return fallback;
        }
        return raw.trim().toUpperCase();
    }
}
