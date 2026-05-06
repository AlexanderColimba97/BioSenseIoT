package com.biosense.iot.ai.domain.port.in;

import com.biosense.iot.ai.domain.RecommendationDomain;
import reactor.core.publisher.Mono;

public interface GenerateRecommendationsUseCase {
    Mono<RecommendationDomain> execute(String userEmail, Integer deviceId, Integer limit);
}
