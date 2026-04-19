package com.biosense.iot.auth.infrastructure.security.jwt;

import com.biosense.iot.auth.domain.port.out.TokenProviderPort;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtAdapter implements TokenProviderPort {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration:3600000}")
    private Long accessTokenExpiration;  // 1 hora

    @Value("${jwt.refresh-expiration:604800000}")
    private Long refreshTokenExpiration;  // 7 días

    @Override
    public String generateToken(String email) {
        return generateAccessToken(email);
    }

    /**
     * Genera un access token de corta duración (1 hora)
     */
    public String generateAccessToken(String email) {
        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .signWith(getSignInKey())
                .compact();
    }

    /**
     * Genera un refresh token de larga duración (7 días)
     */
    public String generateRefreshToken(String email) {
        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
                .signWith(getSignInKey())
                .compact();
    }

    /**
     * Valida un token JWT
     */
    public boolean isTokenValid(String token, String email) {
        try {
            final String tokenEmail = extractUsername(token);
            return (tokenEmail.equals(email)) && !isTokenExpired(token);
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
     * Obtiene la clave secreta para firmar tokens
     */
    private SecretKey getSignInKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
