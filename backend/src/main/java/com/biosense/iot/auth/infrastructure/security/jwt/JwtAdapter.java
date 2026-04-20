package com.biosense.iot.auth.infrastructure.security.jwt;

import com.biosense.iot.auth.domain.port.out.TokenProviderPort;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtAdapter implements TokenProviderPort {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration:3600000}")
    private Long accessTokenExpiration; // 1 hora

    @Value("${jwt.refresh-expiration:604800000}")
    private Long refreshTokenExpiration; // 7 días

    @Override
    public String generateToken(String email) {
        return generateAccessToken(email);
    }

    /**
     * Genera un access token de corta duración (1 hora) con claims de usuario
     */
    public String generateAccessToken(String email) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("type", "user");
        claims.put("scope", "access");

        return Jwts.builder()
                .claims(claims)
                .subject(email)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .signWith(getSignInKey(), Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Genera un token para dispositivos IoT con claims específicos
     * 
     * @param deviceId   ID único del dispositivo
     * @param macAddress MAC del dispositivo
     * @param userId     ID del usuario propietario
     */
    public String generateDeviceToken(String deviceId, String macAddress, Integer userId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("type", "device");
        claims.put("deviceId", deviceId);
        claims.put("mac", macAddress);
        claims.put("userId", userId);
        claims.put("scope", "sensor-write");

        return Jwts.builder()
                .claims(claims)
                .subject(deviceId)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .signWith(getSignInKey(), Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Genera un refresh token de larga duración (7 días)
     */
    public String generateRefreshToken(String email) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("type", "user");
        claims.put("scope", "refresh");

        return Jwts.builder()
                .claims(claims)
                .subject(email)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
                .signWith(getSignInKey(), Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Valida un token JWT con comparación timing-safe
     */
    public boolean isTokenValid(String token, String email) {
        try {
            final String tokenEmail = extractUsername(token);
            return constantTimeEquals(tokenEmail, email) && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Valida un token de dispositivo
     */
    public boolean isDeviceTokenValid(String token, String deviceId) {
        try {
            final String tokenDeviceId = extractClaim(token, claims -> (String) claims.get("deviceId"));
            final String tokenType = extractClaim(token, claims -> (String) claims.get("type"));

            return "device".equals(tokenType) &&
                    constantTimeEquals(tokenDeviceId, deviceId) &&
                    !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Extrae el email del token
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extrae un claim específico del token
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Verifica si el token está expirado
     */
    public boolean isTokenExpired(String token) {
        try {
            return extractExpiration(token).before(new Date());
        } catch (Exception e) {
            return true;
        }
    }

    /**
     * Extrae la fecha de expiración del token
     */
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extrae todos los claims del token
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Comparación timing-safe de strings para evitar timing attacks
     * Utiliza MessageDigest.isEqual() que es resistente a timing attacks
     */
    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return a == b;
        }

        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);

        try {
            return MessageDigest.isEqual(aBytes, bBytes);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Obtiene la clave secreta para firmar tokens
     */
    private SecretKey getSignInKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
