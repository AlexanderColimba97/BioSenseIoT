
package com.biosense.iot.auth.infrastructure.adapter.in.web;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.biosense.iot.auth.domain.port.in.AuthenticateWithGoogleUseCase;
import com.biosense.iot.auth.domain.port.in.LoginUseCase;
import com.biosense.iot.auth.domain.port.in.RegisterUseCase;
import com.biosense.iot.auth.domain.port.out.UserRepositoryPort;
import com.biosense.iot.auth.infrastructure.security.jwt.JwtAdapter;
import com.biosense.iot.dto.AuthResponse;

import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v2/auth")
@RequiredArgsConstructor
public class AuthControllerV2 {

    private static final Logger log = LoggerFactory.getLogger(AuthControllerV2.class);
    private final AuthenticateWithGoogleUseCase authenticateWithGoogleUseCase;
    private final LoginUseCase loginUseCase;
    private final RegisterUseCase registerUseCase;
    private final JwtAdapter jwtAdapter;
    private final UserRepositoryPort userRepositoryPort;

    @PostMapping("/google")
    public Mono<ResponseEntity<AuthResponse>> exchangeGoogleToken(@RequestBody Map<String, String> request) {
        String idToken = request.get("idToken");
        if (idToken == null || idToken.isEmpty()) {
            return Mono.just(ResponseEntity.badRequest().build());
        }
        return authenticateWithGoogleUseCase.execute(idToken)
                .map(ResponseEntity::ok);
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<AuthResponse>> login(@RequestBody Map<String, String> request) {
        return loginUseCase.execute(request.get("email"), request.get("password"))
                .map(ResponseEntity::ok)
                .onErrorResume(e -> Mono.just(ResponseEntity.status(401).build()));
    }

    @PostMapping("/register")
    public Mono<ResponseEntity<AuthResponse>> register(@RequestBody Map<String, String> request) {
        return registerUseCase.execute(request.get("email"), request.get("password"), request.get("fullName"))
                .map(ResponseEntity::ok)
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().build()));
    }

    @PostMapping("/refresh")
    public Mono<ResponseEntity<AuthResponse>> refreshToken(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        String accessToken = request.get("accessToken");

        if ((refreshToken == null || refreshToken.isEmpty()) && (accessToken == null || accessToken.isEmpty())) {
            return Mono.just(ResponseEntity.status(401).body(null));
        }

        String tokenToUse = (refreshToken != null && !refreshToken.isEmpty()) ? refreshToken : accessToken;

        try {
            // Validar el token recibido. Si es access token, solo se usa como fallback
            // cuando el refresh token se perdió en el cliente.
            String email = jwtAdapter.extractUsername(tokenToUse);

            if (email == null || email.isEmpty()) {
                return Mono.just(ResponseEntity.status(401).build());
            }

            // Si se usa refresh token, exigimos que no haya expirado.
            // Si se usa access token como fallback, también exigimos vigencia para no
            // abrir una renovación insegura con tokens vencidos.
            if (jwtAdapter.isTokenExpired(tokenToUse)) {
                log.warn("Refresh token expirado para usuario: {}", email);
                return Mono.just(ResponseEntity.status(401).build());
            }

            // Generar nuevos tokens
            String newAccessToken = jwtAdapter.generateAccessToken(email);
            String newRefreshToken = jwtAdapter.generateRefreshToken(email);

            log.info("Token refrescado exitosamente para usuario: {}", email);

            return userRepositoryPort.findByEmail(email)
                    .map(user -> AuthResponse.builder()
                            .accessToken(newAccessToken)
                            .refreshToken(newRefreshToken)
                            .email(user.getEmail())
                            .fullName(user.getFullName())
                            .build())
                    .map(ResponseEntity::ok)
                    .defaultIfEmpty(ResponseEntity.status(401).build());

        } catch (Exception e) {
            log.error("Error al refrescar token: {}", e.getMessage(), e);
            return Mono.just(ResponseEntity.status(401).build());
        }
    }
}
