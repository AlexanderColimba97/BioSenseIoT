package com.biosense.iot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;

@SpringBootApplication
public class BioSenseApplication {

    public static void main(String[] args) {
        ApplicationContext ctx = SpringApplication.run(BioSenseApplication.class, args);
        validateRequiredSecrets(ctx);
    }

    private static void validateRequiredSecrets(ApplicationContext ctx) {
        org.springframework.core.env.Environment env = ctx.getEnvironment();
        String jwtSecret = env.getProperty("jwt.secret");
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException(
                "FATAL: The 'JWT_SECRET' environment variable is not set. " +
                "Please configure a strong secret before starting the application."
            );
        }
        if (jwtSecret.length() < 32) {
            throw new IllegalStateException(
                "FATAL: 'JWT_SECRET' must be at least 32 characters long to ensure secure token signing."
            );
        }
    }
}
