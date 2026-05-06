package com.biosense.iot.auth.infrastructure.adapter.out.security;

import com.biosense.iot.auth.domain.model.GoogleIdentity;
import com.biosense.iot.auth.domain.port.out.GoogleAuthPort;
import com.biosense.iot.exception.AuthException;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Arrays;
import java.util.List;

@Component
public class GoogleAuthAdapter implements GoogleAuthPort {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthAdapter.class);
    private final GoogleIdTokenVerifier verifier;

    public GoogleAuthAdapter(@Value("${google.client.ids:${GOOGLE_CLIENT_ID:}}") String clientIds) {
        if (clientIds == null || clientIds.isBlank()) {
            throw new IllegalStateException(
                    "Google client ID no configurado. Define GOOGLE_CLIENT_ID o google.client.ids.");
        }

        List<String> audiences = Arrays.stream(clientIds.split(","))
                .map(String::trim)
                .filter(clientId -> !clientId.isBlank())
                .toList();

        if (audiences.isEmpty()) {
            throw new IllegalStateException("Google client ID vacío. Define al menos un client ID válido.");
        }

        this.verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                new GsonFactory())
                .setAudience(audiences)
                .build();
    }

    @Override
    public Mono<GoogleIdentity> verifyToken(String idToken) {
        return Mono.fromCallable(() -> {
            try {
                GoogleIdToken token = verifier.verify(idToken);
                if (token == null) {
                    throw new AuthException("Token de Google inválido o emitido para otra audiencia");
                }
                GoogleIdToken.Payload payload = token.getPayload();
                return new GoogleIdentity(
                        payload.getSubject(),
                        payload.getEmail(),
                        (String) payload.get("name"));
            } catch (AuthException e) {
                throw e;
            } catch (Exception e) {
                log.error("Fallo en adaptador de Google Auth", e);
                throw new AuthException("Error validando con Google: " + e.getMessage());
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }
}
