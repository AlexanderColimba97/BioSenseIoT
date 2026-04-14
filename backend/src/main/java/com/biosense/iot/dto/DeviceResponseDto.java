package com.biosense.iot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceResponseDto {
    private Integer id;
    private String name;
    private String macAddress;
    private Instant lastSeen;
}