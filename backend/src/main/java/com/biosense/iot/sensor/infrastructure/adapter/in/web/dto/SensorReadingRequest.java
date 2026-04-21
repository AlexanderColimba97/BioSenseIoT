package com.biosense.iot.sensor.infrastructure.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorReadingRequest {
    @JsonAlias({ "deviceId" })
    private String macAddress;

    private String readingId;

    @JsonAlias({ "ch4" })
    private Double mq4;

    @JsonAlias({ "co" })
    private Double mq7;

    @JsonAlias({ "airQuality" })
    private Double mq135;

    private Long timestamp;
}
