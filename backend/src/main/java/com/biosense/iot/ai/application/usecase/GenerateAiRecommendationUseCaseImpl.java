package com.biosense.iot.ai.application.usecase;

import com.biosense.iot.ai.domain.model.AiRecommendationDomain;
import com.biosense.iot.ai.domain.port.out.AiRecommendationRepositoryPort;
import com.biosense.iot.ai.infrastructure.adapter.out.ollama.OllamaClient;
import com.biosense.iot.diagnostic.domain.model.DiagnosticDomain;
import com.biosense.iot.pet.domain.model.EnvironmentProfileDomain;
import com.biosense.iot.pet.domain.model.PetProfileDomain;
import com.biosense.iot.sensor.domain.model.SensorReadingDomain;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class GenerateAiRecommendationUseCaseImpl {

    private final OllamaClient ollamaClient;
    private final AiRecommendationRepositoryPort aiRecommendationRepositoryPort;

    /**
     * Genera una recomendación de IA solo si severity es DANGER.
     * No bloquea el flujo principal - usa .onErrorResume() para tolerancia a fallos.
     */
    public Mono<AiRecommendationDomain> generateIfDanger(
            Integer userId,
            Integer diagnosticId,
            Long readingId,
            Integer petId,
            String severity,
            DiagnosticDomain diagnosticInfo,
            SensorReadingDomain reading,
            PetProfileDomain pet,
            EnvironmentProfileDomain environment) {

        // Solo generar si severity es DANGER
        if (!severity.equals("DANGER")) {
            return Mono.empty();
        }

        String prompt = buildContextualPrompt(reading, pet, environment, diagnosticInfo);
        
        return ollamaClient.generateRecommendation(prompt)
                .flatMap(ollamaResponse -> {
                    AiRecommendationDomain recommendation = AiRecommendationDomain.builder()
                            .userId(userId)
                            .diagnosticId(diagnosticId)
                            .readingId(readingId)
                            .petId(petId)
                            .ollamaPrompt(prompt)
                            .aiResponse(ollamaResponse.getRawResponse())
                            .recommendationTitle(ollamaResponse.getTitle())
                            .recommendationText(ollamaResponse.getText())
                            .suggestedActions(ollamaResponse.getActions())
                            .confidenceScore(extractConfidenceScore(ollamaResponse))
                            .processingTimeMs(ollamaResponse.getProcessingTimeMs())
                            .generationStatus(ollamaResponse.getStatus())
                            .errorMessage(ollamaResponse.getErrorMessage())
                            .createdAt(Instant.now())
                            .build();

                    return aiRecommendationRepositoryPort.save(recommendation);
                })
                .doOnSuccess(rec -> log.info("Recomendación IA guardada exitosamente. ID: {}, Status: {}", 
                        rec.getId(), rec.getGenerationStatus()))
                .doOnError(e -> log.error("Error generando recomendación de IA para usuario {}: {}", 
                        userId, e.getMessage(), e))
                .onErrorResume(e -> {
                    // Guardar recomendación con estado ERROR para auditoría
                    AiRecommendationDomain errorRec = AiRecommendationDomain.builder()
                            .userId(userId)
                            .diagnosticId(diagnosticId)
                            .readingId(readingId)
                            .petId(petId)
                            .ollamaPrompt(prompt)
                            .aiResponse("")
                            .recommendationTitle("Error generando recomendación")
                            .recommendationText("No se pudo generar una recomendación en este momento. Consulta con el equipo de soporte.")
                            .suggestedActions("[]")
                            .processingTimeMs(0L)
                            .generationStatus("ERROR")
                            .errorMessage(e.getMessage())
                            .createdAt(Instant.now())
                            .build();
                    
                    return aiRecommendationRepositoryPort.save(errorRec)
                            .doOnNext(saved -> log.info("Recomendación ERROR guardada para auditoría. ID: {}", saved.getId()))
                            .onErrorResume(saveError -> {
                                log.error("Error guardando recomendación ERROR: {}", saveError.getMessage());
                                return Mono.empty();
                            });
                });
    }

    /**
     * Construye un prompt contextualizado con datos del sensor, mascota y entorno
     */
    private String buildContextualPrompt(
            SensorReadingDomain reading,
            PetProfileDomain pet,
            EnvironmentProfileDomain environment,
            DiagnosticDomain diagnosticInfo) {

        return String.format(
            """
            **CONTEXTO DE ALERTA ROJA - CONTAMINACIÓN PERJUDICIAL DETECTADA**
            
            **Lecturas de Sensores:**
            - CO (MQ-7): %.2f ppm
            - CH4 (MQ-4): %.2f ppm
            - Calidad de Aire (MQ-135): %.2f
            - Diagnóstico: %s
            - Severidad: %s
            - Riesgo: %s
            - Confianza: %.0f%%
            
            **Mascota Registrada:**
            - Especie: %s
            - Raza: %s
            - Edad: %d años
            - Peso: %.1f kg
            - Nivel de Sensibilidad: %s
            - Riesgo Respiratorio: %s
            - Actividad: %s
            - Riesgo de Salud: %s
            
            **Contexto Ambiental:**
            - Tipo de Espacio: %s
            - Área: %s
            - Ventilación: %s
            - Contexto Urbano: %s
            
            **TAREA:**
            Basándote en los datos anteriores, genera una recomendación JSON estructurada con:
            1. "title": Título breve (máx 50 caracteres) para la recomendación
            2. "text": Recomendación detallada y contextualizada para proteger al usuario y mascota
            3. "actions": Array de acciones concretas numeradas (máximo 5)
            4. "urgency": "CRITICAL" o "HIGH"
            
            Responde SOLO con JSON válido, sin markdown code blocks.
            """,
            reading.getMq7(),
            reading.getMq4(),
            reading.getMq135(),
            diagnosticInfo.getDiagnosticText(),
            diagnosticInfo.getSeverity(),
            diagnosticInfo.getRiskLevel(),
            diagnosticInfo.getConfidence() != null ? diagnosticInfo.getConfidence() * 100 : 0,
            pet.getSpecies(),
            pet.getBreed(),
            pet.getAgeYears() != null ? pet.getAgeYears() : 0,
            pet.getWeightKg() != null ? pet.getWeightKg() : 0,
            pet.getSensitivityLevel(),
            pet.getRespiratoryRisk(),
            pet.getActivityLevel(),
            pet.getHealthRiskLevel(),
            environment.getSpaceType(),
            environment.getAreaType(),
            environment.getVentilationLevel(),
            environment.getUrbanContext()
        );
    }

    /**
     * Extrae score de confianza de la respuesta (0-1)
     */
    private Double extractConfidenceScore(OllamaClient.OllamaResponse response) {
        if ("SUCCESS".equals(response.getStatus())) {
            return 0.85; // Confianza moderada si fue exitoso
        }
        if ("TIMEOUT".equals(response.getStatus())) {
            return 0.5; // Confianza baja si fue timeout
        }
        return 0.0; // Sin confianza si hubo error
    }
}
