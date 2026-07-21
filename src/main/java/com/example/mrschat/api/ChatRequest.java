package com.example.mrschat.api;

import jakarta.validation.constraints.NotBlank;

public record ChatRequest(
        @NotBlank String model,
        @NotBlank String message,
        @NotBlank String sessionid,
        @NotBlank String mode,
        String promptPreset,
        String systemMessage,
        Boolean ragMode,
        String tableName
) {
}
