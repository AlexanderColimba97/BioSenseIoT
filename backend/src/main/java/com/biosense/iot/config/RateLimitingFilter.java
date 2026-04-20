package com.biosense.iot.config;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate Limiting Filter que implementa Token Bucket Algorithm
 * Protege contra ataques de fuerza bruta y DDoS
 */
@Component
public class RateLimitingFilter implements WebFilter {

    private static final int RATE_LIMIT_REQUESTS = 100; // 100 solicitudes
    private static final long RATE_LIMIT_WINDOW_SECONDS = 60; // por minuto
    private static final int BURST_CAPACITY = 20; // capacidad de ráfaga

    private static class RateLimitBucket {
        private AtomicInteger tokens;
        private long lastRefillTime;
        private final int capacity;

        RateLimitBucket(int capacity) {
            this.capacity = capacity;
            this.tokens = new AtomicInteger(capacity);
            this.lastRefillTime = System.currentTimeMillis();
        }

        synchronized boolean tryConsume() {
            refillTokens();

            if (tokens.get() > 0) {
                tokens.decrementAndGet();
                return true;
            }
            return false;
        }

        private void refillTokens() {
            long now = System.currentTimeMillis();
            long timePassed = now - lastRefillTime;

            if (timePassed > RATE_LIMIT_WINDOW_SECONDS * 1000) {
                tokens.set(capacity);
                lastRefillTime = now;
            }
        }
    }

    private final ConcurrentHashMap<String, RateLimitBucket> buckets = new ConcurrentHashMap<>();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        // No aplicar rate limiting a endpoints públicos
        String path = exchange.getRequest().getPath().value();
        if (isPublicEndpoint(path)) {
            return chain.filter(exchange);
        }

        // Obtener identificador del cliente (IP o usuario)
        String clientId = getClientIdentifier(exchange);

        // Obtener o crear bucket para este cliente
        RateLimitBucket bucket = buckets.computeIfAbsent(
                clientId,
                k -> new RateLimitBucket(BURST_CAPACITY));

        // Intentar consumir un token
        if (bucket.tryConsume()) {
            // Token disponible, continuar
            return chain.filter(exchange);
        } else {
            // Rate limit alcanzado
            exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            exchange.getResponse().getHeaders().add("Retry-After", "60");
            return exchange.getResponse().setComplete();
        }
    }

    /**
     * Identifica al cliente por IP remota o usuario autenticado
     */
    private String getClientIdentifier(ServerWebExchange exchange) {
        // Intentar obtener el usuario autenticado
        try {
            var auth = exchange.getPrincipal();
            if (auth != null) {
                return "user:" + auth.block().getName();
            }
        } catch (Exception e) {
            // No hay autenticación disponible
        }

        // Usar IP remota como alternativa
        String remoteAddress = exchange.getRequest().getRemoteAddress() != null
                ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                : "unknown";

        return "ip:" + remoteAddress;
    }

    /**
     * Define endpoints públicos que no necesitan rate limiting estricto
     */
    private boolean isPublicEndpoint(String path) {
        return path.startsWith("/api/v2/auth/") ||
                path.startsWith("/api/v2/sensors/reading") ||
                path.startsWith("/health") ||
                path.startsWith("/actuator");
    }

    /**
     * Limpia buckets antiguos cada 5 minutos
     * Previene memory leaks de clientes inactivos
     */
    public void cleanupOldBuckets() {
        long now = System.currentTimeMillis();
        long timeout = 5 * 60 * 1000; // 5 minutos

        buckets.entrySet().removeIf(entry -> {
            RateLimitBucket bucket = entry.getValue();
            return (now - bucket.lastRefillTime) > timeout;
        });
    }
}
