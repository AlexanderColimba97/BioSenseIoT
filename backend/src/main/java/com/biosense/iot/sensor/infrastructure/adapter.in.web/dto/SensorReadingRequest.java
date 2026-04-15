package com.biosense.iot.sensor.infrastructure.adapter.in.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorReadingRequest {
    private String macAddress;
    private Double mq4;
    private Double mq7;
    private Double mq135;
}
