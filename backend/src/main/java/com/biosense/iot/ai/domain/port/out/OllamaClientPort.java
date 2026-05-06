package com.biosense.iot.ai.domain.port.out;

import reactor.core.publisher.Mono;

public interface OllamaClientPort {
    Mono<String> generate(String prompt);
}
