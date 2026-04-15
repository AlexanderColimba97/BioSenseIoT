package com.biosense.iot.device.infrastructure.adapter.in.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorReadingResponseDto {
    private Long id;
    private Double mq4;
    private Double mq7;
    private Double mq135;
    private java.time.Instant timestamp;
    private String airQualityState;
}
