package com.biosense.iot.device.infrastructure.adapter.in.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LinkDeviceResponse {
    private String status;
    private Integer deviceId;
    private String macAddress;
    private String name;
    private String apiSecret;
}
