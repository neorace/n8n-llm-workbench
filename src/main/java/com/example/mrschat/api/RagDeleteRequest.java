package com.example.mrschat.api;

import jakarta.validation.constraints.NotBlank;

public record RagDeleteRequest(
        @NotBlank String tableName,
        @NotBlank String mode
) {
}
