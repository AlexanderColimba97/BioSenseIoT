package com.biosense.iot.ai.domain;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class RecommendationDomain {
    String summary;
    List<String> suggestions;
}
