package com.biosense.iot.ai.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRecommendationDomain {
    private Long id;
    private Integer userId;
    private Integer diagnosticId;
    private Long readingId;
    private Integer petId;
    private String ollamaPrompt;
    private String aiResponse;
    private String recommendationTitle;
    private String recommendationText;
    private String suggestedActions;
    private Double confidenceScore;
    private Long processingTimeMs;
    private String generationStatus; // SUCCESS, TIMEOUT, ERROR
    private String errorMessage;
    private Instant createdAt;
}
