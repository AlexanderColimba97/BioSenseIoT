package com.biosense.iot.ai.application.usecase;

import com.biosense.iot.ai.domain.port.out.OllamaClientPort;
import com.biosense.iot.pet.application.usecase.ManageProfileContextUseCase;
import com.biosense.iot.pet.domain.model.EnvironmentProfileDomain;
import com.biosense.iot.pet.domain.model.PetProfileDomain;
import com.biosense.iot.pet.domain.model.UserContextProfileDomain;
import com.biosense.iot.sensor.domain.model.SensorReadingDomain;
import com.biosense.iot.sensor.domain.port.in.GetDeviceReadingsUseCase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenerateRecommendationsUseCaseImplTest {

    @Mock
    private GetDeviceReadingsUseCase getDeviceReadingsUseCase;

    @Mock
    private ManageProfileContextUseCase manageProfileContextUseCase;

    @Mock
    private OllamaClientPort ollamaClientPort;

    @InjectMocks
    private GenerateRecommendationsUseCaseImpl useCase;

    @Test
    void execute_buildsPromptFromProfileAndReadingsAndWrapsOllamaResponse() {
        String userEmail = "user@example.com";
        Integer deviceId = 7;
        Integer limit = 3;

        PetProfileDomain pet = PetProfileDomain.builder()
                .name("Luna")
                .species("Dog")
                .ageYears(4)
                .sensitivityLevel("high")
                .respiratoryRisk("medium")
                .activityLevel("medium")
                .build();

        EnvironmentProfileDomain environment = EnvironmentProfileDomain.builder()
                .profileName("Home")
                .spaceType("Apartment")
                .areaType("Indoor")
                .ventilationLevel("low")
                .urbanContext("urban")
                .notes("Close windows during traffic hours")
                .build();

        UserContextProfileDomain profile = UserContextProfileDomain.builder()
                .email(userEmail)
                .pets(List.of(pet))
                .environment(environment)
                .build();

        SensorReadingDomain reading = new SensorReadingDomain(deviceId, "reading-1", 10.0, 20.0, 30.0);

        when(manageProfileContextUseCase.getContext(userEmail)).thenReturn(Mono.just(profile));
        when(getDeviceReadingsUseCase.execute(userEmail, deviceId, limit)).thenReturn(Flux.just(reading));
        when(ollamaClientPort.generate(org.mockito.ArgumentMatchers.anyString())).thenReturn(Mono.just("{"));

        StepVerifier.create(useCase.execute(userEmail, deviceId, limit))
                .assertNext(result -> {
                    assertThat(result.getSummary()).isEqualTo("{");
                    assertThat(result.getSuggestions()).isEmpty();
                })
                .verifyComplete();

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(ollamaClientPort).generate(promptCaptor.capture());
        assertThat(promptCaptor.getValue()).contains("user@example.com");
        assertThat(promptCaptor.getValue()).contains("Luna");
        assertThat(promptCaptor.getValue()).contains("mq7=20.0");
    }
}
